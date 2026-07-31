import { EmploymentStatus, LedgerEntryType, OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { addMonthsClamped } from "./dateMath";
import { PricedOrderItem } from "./orderItems";

export class InsufficientBalanceError extends Error {
  constructor(public readonly balanceEur: number, public readonly totalEur: number) {
    super(`Unzureichendes Guthaben: verfügbar ${balanceEur} €, benötigt ${totalEur} €.`);
  }
}

export class OrderNotPendingError extends Error {
  constructor() {
    super("Bestellung ist nicht (mehr) im Status 'pending'.");
  }
}

export class EmployeeResignedError extends Error {
  constructor() {
    super("Mitarbeiter ist nicht mehr aktiv beschäftigt — Bestellung kann nicht freigegeben werden.");
  }
}

export class InvalidStatusTransitionError extends Error {}

/**
 * Approves a pending order: verifies sufficient balance, writes a single
 * order_deduction ledger row, and flips the order to 'approved' — all in one
 * transaction so balance and order status can never drift apart.
 *
 * The status flip is a conditional `updateMany` (WHERE status = 'pending')
 * rather than a plain update, and runs *first*, before the balance check.
 * Postgres takes a row lock for the duration of the transaction as soon as
 * that UPDATE executes, so if two approve requests for the same order land
 * concurrently (double-click, two admins), the second one blocks until the
 * first commits or rolls back, then re-evaluates its WHERE clause against
 * the now-'approved' row and affects zero rows — it can no longer sneak
 * through and write a second order_deduction. A plain SELECT-then-UPDATE
 * (the previous version of this function) does not have this property:
 * both transactions could read status='pending' before either commits.
 */
export async function approveOrder(orderId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const claim = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.pending },
      data: { status: OrderStatus.approved, decidedAt: now, decidedByUserId: adminUserId },
    });

    if (claim.count === 0) {
      const existing = await tx.order.findUnique({ where: { id: orderId } });
      if (!existing) throw new Error("Bestellung nicht gefunden.");
      throw new OrderNotPendingError();
    }

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    // Locks this employee's user row for the rest of the transaction *before*
    // reading anything about them. This closes two races at once: two
    // different orders for the same employee racing on the same balance
    // (the original reason for this lock), and — just as importantly — a
    // resignation committing between an unlocked read of employmentStatus
    // and this lock, which would let the check below pass on stale data.
    // Locking first and reading after means both checks always see a row
    // that can no longer change out from under this transaction.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${order.userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });

    // A pending order can outlive the employee who placed it — approving it
    // after they've resigned would deduct budget and hand out gear (or at
    // least mark it ready to hand out) to someone no longer employed.
    // Rejecting a resigned employee's stale pending order is still fine
    // (no budget/goods effect), so this check only applies here.
    if (user.employmentStatus !== EmploymentStatus.active) {
      throw new EmployeeResignedError();
    }

    const totalEur = order.items.reduce((sum, item) => sum + item.unitPriceEur * item.quantity, 0);

    const balanceAgg = await tx.budgetLedgerEntry.aggregate({
      where: { userId: order.userId },
      _sum: { amountEur: true },
    });
    const balanceEur = balanceAgg._sum.amountEur ?? 0;

    if (balanceEur < totalEur) {
      // Throwing rolls back the whole transaction, including the status
      // flip above — the order is left exactly as it was.
      throw new InsufficientBalanceError(balanceEur, totalEur);
    }

    await tx.budgetLedgerEntry.create({
      data: {
        userId: order.userId,
        entryType: LedgerEntryType.order_deduction,
        amountEur: -totalEur,
        relatedOrderId: order.id,
        effectiveDate: now,
        note: `Abzug für freigegebene Bestellung #${order.id}.`,
        createdByUserId: adminUserId,
      },
    });

    return order;
  });
}

export async function rejectOrder(orderId: string, adminUserId: string, reason: string) {
  const claim = await prisma.order.updateMany({
    where: { id: orderId, status: OrderStatus.pending },
    data: {
      status: OrderStatus.rejected,
      decidedAt: new Date(),
      decidedByUserId: adminUserId,
      rejectionReason: reason,
    },
  });

  if (claim.count === 0) {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) throw new Error("Bestellung nicht gefunden.");
    throw new OrderNotPendingError();
  }

  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

export async function updateOrderStatus(orderId: string, status: "ready_for_pickup" | "issued") {
  const fromStatus = status === "ready_for_pickup" ? OrderStatus.approved : OrderStatus.ready_for_pickup;

  // A conditional updateMany (not findUnique-then-update) so two concurrent
  // PATCH calls for the same order can't both read the same starting status
  // and both "succeed" — the same race-closing pattern as approveOrder/
  // rejectOrder, applied here for consistency even though today's status
  // values carry no side effects that a double-write could corrupt.
  const claim = await prisma.order.updateMany({
    where: { id: orderId, status: fromStatus },
    data: { status },
  });

  if (claim.count === 0) {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) throw new Error("Bestellung nicht gefunden.");
    throw new InvalidStatusTransitionError(
      "Statuswechsel nur nach Freigabe (approved -> ready_for_pickup -> issued) möglich."
    );
  }

  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
}

/**
 * Replaces a pending order's line items wholesale (product/color, size,
 * quantity) — the admin-side "I made a mistake, let me fix it" escape
 * hatch. Deliberately restricted to 'pending': once approved, a budget
 * deduction has already been booked for the *original* total, and editing
 * the items afterwards would silently desync that ledger entry from what
 * the order now actually contains. Rejecting and having the employee
 * resubmit is the correct fix past that point.
 *
 * Same conditional-updateMany claim as approveOrder/rejectOrder/
 * updateOrderStatus: re-affirming status='pending' as a no-op write still
 * takes Postgres's row lock for the rest of the transaction, so a concurrent
 * approve can't slip in between the check and the item replacement below.
 */
export async function updateOrderItems(orderId: string, items: PricedOrderItem[]) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: OrderStatus.pending },
      data: { status: OrderStatus.pending },
    });

    if (claim.count === 0) {
      const existing = await tx.order.findUnique({ where: { id: orderId } });
      if (!existing) throw new Error("Bestellung nicht gefunden.");
      throw new OrderNotPendingError();
    }

    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.orderItem.createMany({ data: items.map((item) => ({ orderId, ...item })) });

    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
  });
}

/**
 * Marks orders placed within the last 3 months before resignation for
 * potential reclaim, per catalog rule. Just a flag — no automatic reclaim.
 *
 * Restricted to orders that actually resulted in budget being spent /
 * goods being handed out (approved, ready_for_pickup, issued) — a pending
 * order never deducted anything and a rejected one never happened, so
 * flagging either for "reclaim" would tell staff to recover gear that was
 * never given out in the first place.
 */
export async function flagOrdersForReclaim(userId: string, resignationDate: Date) {
  const cutoff = addMonthsClamped(resignationDate, -3);

  return prisma.order.updateMany({
    where: {
      userId,
      submittedAt: { gte: cutoff },
      status: { in: [OrderStatus.approved, OrderStatus.ready_for_pickup, OrderStatus.issued] },
    },
    data: { reclaimFlag: true },
  });
}
