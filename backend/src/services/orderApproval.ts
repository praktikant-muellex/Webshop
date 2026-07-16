import { LedgerEntryType, OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma";

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

/**
 * Approves a pending order: verifies sufficient balance, writes a single
 * order_deduction ledger row, and flips the order to 'approved' — all in one
 * transaction so balance and order status can never drift apart.
 */
export async function approveOrder(orderId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Bestellung nicht gefunden.");
    if (order.status !== OrderStatus.pending) throw new OrderNotPendingError();

    const totalEur = order.items.reduce((sum, item) => sum + item.unitPriceEur * item.quantity, 0);

    const balanceAgg = await tx.budgetLedgerEntry.aggregate({
      where: { userId: order.userId },
      _sum: { amountEur: true },
    });
    const balanceEur = balanceAgg._sum.amountEur ?? 0;

    if (balanceEur < totalEur) {
      throw new InsufficientBalanceError(balanceEur, totalEur);
    }

    const now = new Date();

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

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.approved,
        decidedAt: now,
        decidedByUserId: adminUserId,
      },
      include: { items: true },
    });
  });
}

export async function rejectOrder(orderId: string, adminUserId: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Bestellung nicht gefunden.");
  if (order.status !== OrderStatus.pending) throw new OrderNotPendingError();

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.rejected,
      decidedAt: new Date(),
      decidedByUserId: adminUserId,
      rejectionReason: reason,
    },
  });
}

export async function updateOrderStatus(orderId: string, status: "ready_for_pickup" | "issued") {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Bestellung nicht gefunden.");
  if (order.status !== OrderStatus.approved && !(order.status === OrderStatus.ready_for_pickup && status === "issued")) {
    throw new Error("Statuswechsel nur nach Freigabe (approved -> ready_for_pickup -> issued) möglich.");
  }
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}

/**
 * Marks orders placed within the last 3 months before resignation for
 * potential reclaim, per catalog rule. Just a flag — no automatic reclaim.
 */
export async function flagOrdersForReclaim(userId: string, resignationDate: Date) {
  const cutoff = new Date(resignationDate);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 3);

  return prisma.order.updateMany({
    where: { userId, submittedAt: { gte: cutoff } },
    data: { reclaimFlag: true },
  });
}
