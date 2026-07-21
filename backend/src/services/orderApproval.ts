import { EmploymentStatus, LedgerEntryType, OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { addMonthsClamped } from "./dateMath";

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
      include: { items: true, user: true },
    });

    // A pending order can outlive the employee who placed it — approving it
    // after they've resigned would deduct budget and hand out gear (or at
    // least mark it ready to hand out) to someone no longer employed.
    // Rejecting a resigned employee's stale pending order is still fine
    // (no budget/goods effect), so this check only applies here.
    if (order.user.employmentStatus !== EmploymentStatus.active) {
      throw new EmployeeResignedError();
    }

    // Locks this employee's user row for the rest of the transaction. Without
    // it, approving two *different* pending orders for the same employee at
    // nearly the same time could each read the same pre-deduction balance,
    // both pass the check below, and both commit — overspending the budget.
    // The updateMany above only guards against re-approving the *same*
    // order, not two different orders racing on the same employee's balance.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${order.userId} FOR UPDATE`;

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

  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
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
