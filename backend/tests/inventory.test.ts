import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./helpers/resetDb";
import { createEmployeeGroup, createEmployee, createProduct, createOrder } from "./helpers/factories";
import { createManualAdjustment } from "../src/services/budgetLedger";
import { approveOrder } from "../src/services/orderApproval";
import { submitInventorySession, getSessionWithComparison, getInventoryOverview } from "../src/services/inventory";

beforeEach(resetDb);

/**
 * Regression coverage for two real production bugs found this session:
 * (1) entering a stocktake count that exactly matched the expected stock
 *     still showed a difference of -1 instead of 0, and
 * (2) "Verkauft seither" kept counting a sale that had already been
 *     reflected in a same-day follow-up stocktake, instead of resetting.
 * Both traced back to using the stocktake's calendar date (no time-of-day)
 * as the boundary for "sold since", which can't tell a sale earlier today
 * (already reflected in today's physical count) from one later today
 * (not yet reflected) — see effectiveBoundary() in src/services/inventory.ts.
 */
describe("inventory same-day stocktake boundary", () => {
  it("does not show a phantom difference for a sale already reflected in the same-day count", async () => {
    const group = await createEmployeeGroup();
    const employee = await createEmployee(group.id);
    const admin = await createEmployee(group.id, { employeeNumber: "admin" });
    const product = await createProduct({ priceEur: 10 });
    await createManualAdjustment(employee.id, 100, "Startguthaben", admin.id);

    // Morning: stocktake shows 10 in stock.
    const sessionA = await submitInventorySession([{ productId: product.id, quantity: 10 }], admin.id);

    // Midday: one unit is sold (order approved).
    const order = await createOrder(employee.id, product.id, { unitPriceEur: 10, quantity: 1 });
    await approveOrder(order.id, admin.id);

    // Afternoon, same day: a follow-up stocktake correctly counts 9 left.
    const sessionB = await submitInventorySession([{ productId: product.id, quantity: 9 }], admin.id);

    const { rows } = await getSessionWithComparison(sessionB.id);
    const row = rows.find((r) => r.productName === product.name)!;

    expect(row.previousCount).toBe(10);
    expect(row.soldSincePrevious).toBe(1);
    expect(row.expectedStock).toBe(9);
    expect(row.difference).toBe(0); // was -1 before the fix
    void sessionA;
  });

  it("does not keep counting a sale toward 'sold since' after a newer stocktake supersedes it", async () => {
    const group = await createEmployeeGroup();
    const employee = await createEmployee(group.id);
    const admin = await createEmployee(group.id, { employeeNumber: "admin" });
    const product = await createProduct({ priceEur: 10 });
    await createManualAdjustment(employee.id, 100, "Startguthaben", admin.id);

    await submitInventorySession([{ productId: product.id, quantity: 10 }], admin.id);
    const order1 = await createOrder(employee.id, product.id, { unitPriceEur: 10, quantity: 1 });
    await approveOrder(order1.id, admin.id);
    await submitInventorySession([{ productId: product.id, quantity: 9 }], admin.id);

    // Right after the new stocktake, nothing has sold yet against it.
    const overviewRightAfter = await getInventoryOverview();
    const rowRightAfter = overviewRightAfter.rows.find((r) => r.productName === product.name)!;
    expect(rowRightAfter.soldSincePrevious).toBe(0); // was still 1 before the fix

    // A second sale after the new stocktake should count once, not on top
    // of the already-reflected first sale.
    const order2 = await createOrder(employee.id, product.id, { unitPriceEur: 10, quantity: 1 });
    await approveOrder(order2.id, admin.id);

    const overviewAfterSecondSale = await getInventoryOverview();
    const rowAfterSecondSale = overviewAfterSecondSale.rows.find((r) => r.productName === product.name)!;
    expect(rowAfterSecondSale.soldSincePrevious).toBe(1);
    expect(rowAfterSecondSale.expectedStock).toBe(8); // 9 - 1, not 10 - 2
  });
});
