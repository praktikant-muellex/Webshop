import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/db/prisma";
import { resetDb } from "./helpers/resetDb";
import { createEmployeeGroup, createEmployee, createProduct, createOrder } from "./helpers/factories";
import { createManualAdjustment, getBalanceEur } from "../src/services/budgetLedger";
import {
  approveOrder,
  rejectOrder,
  updateOrderStatus,
  flagOrdersForReclaim,
  InsufficientBalanceError,
  OrderNotPendingError,
  EmployeeResignedError,
  InvalidStatusTransitionError,
} from "../src/services/orderApproval";

beforeEach(resetDb);

async function setup(balanceEur = 100) {
  const group = await createEmployeeGroup();
  const employee = await createEmployee(group.id);
  const admin = await createEmployee(group.id, { employeeNumber: "admin" });
  if (balanceEur > 0) {
    await createManualAdjustment(employee.id, balanceEur, "Startguthaben", admin.id);
  }
  const product = await createProduct({ priceEur: 20 });
  return { group, employee, admin, product };
}

describe("approveOrder", () => {
  it("deducts the order total and flips status to approved when balance suffices", async () => {
    const { employee, admin, product } = await setup(100);
    const order = await createOrder(employee.id, product.id, { unitPriceEur: 20, quantity: 2 });

    const result = await approveOrder(order.id, admin.id);

    expect(result.status).toBe("approved");
    expect(await getBalanceEur(employee.id)).toBe(60); // 100 - 40
  });

  it("refuses to approve when the balance is insufficient, leaving the order pending", async () => {
    const { employee, admin, product } = await setup(10);
    const order = await createOrder(employee.id, product.id, { unitPriceEur: 20, quantity: 1 });

    await expect(approveOrder(order.id, admin.id)).rejects.toThrow(InsufficientBalanceError);

    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe("pending");
    expect(await getBalanceEur(employee.id)).toBe(10); // untouched
  });

  it("refuses to approve an order from an employee who has since resigned", async () => {
    const { employee, admin, product } = await setup(100);
    const order = await createOrder(employee.id, product.id, { unitPriceEur: 20 });
    await prisma.user.update({ where: { id: employee.id }, data: { employmentStatus: "resigned" } });

    await expect(approveOrder(order.id, admin.id)).rejects.toThrow(EmployeeResignedError);
  });

  it("refuses to approve an order that is no longer pending", async () => {
    const { employee, admin, product } = await setup(100);
    const order = await createOrder(employee.id, product.id, { unitPriceEur: 20, status: "rejected" });

    await expect(approveOrder(order.id, admin.id)).rejects.toThrow(OrderNotPendingError);
  });
});

describe("rejectOrder", () => {
  it("sets the order to rejected with the given reason", async () => {
    const { employee, admin, product } = await setup(0);
    const order = await createOrder(employee.id, product.id);

    const result = await rejectOrder(order.id, admin.id, "Größe nicht verfügbar");

    expect(result.status).toBe("rejected");
    expect(result.rejectionReason).toBe("Größe nicht verfügbar");
  });

  it("refuses to reject an order that is no longer pending", async () => {
    const { employee, admin, product } = await setup(0);
    const order = await createOrder(employee.id, product.id, { status: "approved" });

    await expect(rejectOrder(order.id, admin.id, "zu spät")).rejects.toThrow(OrderNotPendingError);
  });
});

describe("updateOrderStatus", () => {
  it("walks approved -> ready_for_pickup -> issued", async () => {
    const { employee, product } = await setup(0);
    const order = await createOrder(employee.id, product.id, { status: "approved" });

    const step1 = await updateOrderStatus(order.id, "ready_for_pickup");
    expect(step1.status).toBe("ready_for_pickup");

    const step2 = await updateOrderStatus(order.id, "issued");
    expect(step2.status).toBe("issued");
  });

  it("rejects an out-of-order transition", async () => {
    const { employee, product } = await setup(0);
    const order = await createOrder(employee.id, product.id, { status: "pending" });

    await expect(updateOrderStatus(order.id, "issued")).rejects.toThrow(InvalidStatusTransitionError);
  });
});

describe("flagOrdersForReclaim", () => {
  it("flags only orders within 3 months of resignation that actually spent budget", async () => {
    const { employee, product } = await setup(0);
    const resignationDate = new Date(Date.UTC(2026, 6, 22));

    const withinWindowApproved = await createOrder(employee.id, product.id, {
      status: "issued",
      submittedAt: new Date(Date.UTC(2026, 5, 1)),
    });
    const withinWindowPending = await createOrder(employee.id, product.id, {
      status: "pending",
      submittedAt: new Date(Date.UTC(2026, 5, 1)),
    });
    const outsideWindow = await createOrder(employee.id, product.id, {
      status: "issued",
      submittedAt: new Date(Date.UTC(2026, 1, 1)),
    });

    await flagOrdersForReclaim(employee.id, resignationDate);

    const flagged = await prisma.order.findMany({ where: { userId: employee.id, reclaimFlag: true } });
    const flaggedIds = flagged.map((o) => o.id);
    expect(flaggedIds).toContain(withinWindowApproved.id);
    expect(flaggedIds).not.toContain(withinWindowPending.id); // never spent anything
    expect(flaggedIds).not.toContain(outsideWindow.id);
  });
});
