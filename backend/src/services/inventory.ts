import { OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { endOfDay } from "./dateMath";

/**
 * Every product's "sold" quantity for inventory purposes counts order items
 * from orders that were actually approved (budget-deducted) in the given
 * window, keyed by decidedAt — pending orders haven't happened yet and
 * rejected ones never did. Later status advances (ready_for_pickup, issued)
 * don't change the count; approval is the point the stock left the shelf.
 *
 * Callers pass `takenAt` (the physical stocktake date an admin can back-date)
 * as the window boundaries, not `createdAt` (when the row was inserted) —
 * those two can diverge, and "sold since the stocktake" only makes sense
 * relative to the date the count actually happened.
 */
async function soldQuantityByProduct(from: Date, to: Date): Promise<Map<string, number>> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { not: OrderStatus.rejected },
        decidedAt: { gt: from, lte: to },
      },
    },
    select: { productId: true, quantity: true },
  });

  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  return totals;
}

/** The session immediately before the given one (by takenAt, then createdAt as a tiebreaker). */
async function findPreviousSession(session: { takenAt: Date; createdAt: Date }) {
  return prisma.inventorySession.findFirst({
    where: {
      OR: [
        { takenAt: { lt: session.takenAt } },
        { takenAt: session.takenAt, createdAt: { lt: session.createdAt } },
      ],
    },
    orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
    include: { counts: true },
  });
}

/**
 * The instant a session's counts should be treated as "locked in" for sales
 * attribution — the boundary that separates "already reflected in this
 * physical count" from "sold after it, counts toward the next one."
 *
 * `takenAt` is a `@db.Date` (no time-of-day), so on its own it can't tell
 * apart an order decided at 9am today (before the shelf was counted) from
 * one decided at 3pm today (after) — both just land on "today". Using the
 * session's actual `createdAt` timestamp for same-day sessions (the admin
 * saves right after finishing the physical count, so "now" at save time is
 * a good proxy for "when the count was taken") fixes that: a sale already
 * reflected in the count is *before* createdAt and correctly stops being
 * counted again toward the next session's "sold since". Without this, the
 * same sale gets attributed twice — once implicitly (a lower physical
 * count) and once explicitly ("Verkauft seither" never clearing it) — and
 * every same-day sale around a stocktake permanently and silently inflates
 * apparent sales for the next round.
 *
 * For a deliberately back-dated entry (takenAt on an earlier calendar day
 * than createdAt), there's no better information than the date itself, so
 * this falls back to the end of that day.
 */
function effectiveBoundary(session: { takenAt: Date; createdAt: Date }): Date {
  const sameDay =
    session.takenAt.getUTCFullYear() === session.createdAt.getUTCFullYear() &&
    session.takenAt.getUTCMonth() === session.createdAt.getUTCMonth() &&
    session.takenAt.getUTCDate() === session.createdAt.getUTCDate();
  return sameDay ? session.createdAt : endOfDay(session.takenAt);
}

/**
 * The "Differenz" that was recorded when the given session was itself taken:
 * its counted quantity per product minus what was expected at that time,
 * based on whatever session came before it. Null per product with no prior
 * session to compare against (e.g. a product added after the last stocktake).
 */
async function differenceAgainstPrevious(session: {
  takenAt: Date;
  createdAt: Date;
  counts: { productId: string; quantity: number }[];
}): Promise<Map<string, number>> {
  const previous = await findPreviousSession(session);
  const sold = previous
    ? await soldQuantityByProduct(effectiveBoundary(previous), effectiveBoundary(session))
    : new Map<string, number>();
  const previousCounts = new Map(previous?.counts.map((c) => [c.productId, c.quantity]) ?? []);

  const result = new Map<string, number>();
  for (const c of session.counts) {
    const prevCount = previousCounts.get(c.productId);
    if (prevCount === undefined) continue;
    const soldQty = sold.get(c.productId) ?? 0;
    result.set(c.productId, c.quantity - (prevCount - soldQty));
  }
  return result;
}

/**
 * Baseline for a new stocktake: the most recently recorded session's counts,
 * minus everything sold since that session was taken (up to now). The admin
 * then enters a fresh physical count per product, and the "Differenz" is
 * simply that new count minus this expected stock — computed live in the
 * frontend as they type, never stored.
 */
export async function getInventoryOverview() {
  const [referenceSession, products] = await Promise.all([
    prisma.inventorySession.findFirst({
      orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
      include: {
        counts: true,
        createdByUser: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.product.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  // Lower bound uses the same effectiveBoundary as differenceAgainstPrevious
  // uses for ITS upper bound once this session becomes "previous" for the
  // next stocktake — otherwise a sale already reflected in this session's
  // own count gets attributed a second time toward the next one.
  const [soldSinceReference, lastDifferenceByProduct] = await Promise.all([
    referenceSession
      ? soldQuantityByProduct(effectiveBoundary(referenceSession), new Date())
      : Promise.resolve(new Map<string, number>()),
    referenceSession ? differenceAgainstPrevious(referenceSession) : Promise.resolve(new Map<string, number>()),
  ]);

  const referenceCounts = new Map(referenceSession?.counts.map((c) => [c.productId, c.quantity]) ?? []);

  const rows = products.map((product) => {
    const previousCount = referenceCounts.get(product.id) ?? null;
    const sold = soldSinceReference.get(product.id) ?? 0;
    const expectedStock = previousCount !== null ? previousCount - sold : null;

    return {
      productId: product.id,
      productName: product.name,
      color: product.color,
      category: product.category,
      previousCount,
      soldSincePrevious: referenceSession ? sold : null,
      expectedStock,
      lastDifference: lastDifferenceByProduct.get(product.id) ?? null,
    };
  });

  return {
    latestSession: referenceSession
      ? {
          id: referenceSession.id,
          takenAt: referenceSession.takenAt,
          createdAt: referenceSession.createdAt,
          createdBy: referenceSession.createdByUser,
        }
      : null,
    rows,
  };
}

export async function submitInventorySession(
  counts: Array<{ productId: string; quantity: number }>,
  createdByUserId: string,
  takenAt: Date = new Date()
) {
  return prisma.inventorySession.create({
    data: {
      takenAt,
      createdByUserId,
      counts: { create: counts },
    },
    include: { counts: true },
  });
}

export async function listInventorySessions() {
  return prisma.inventorySession.findMany({
    orderBy: [{ takenAt: "desc" }, { createdAt: "desc" }],
    include: { createdByUser: { select: { firstName: true, lastName: true, email: true } } },
  });
}

/**
 * A single historical session plus the same Differenz math shown on the
 * overview page, but anchored to whatever session came immediately before
 * *this* one — not necessarily the globally most recent — so a PDF for an
 * older stocktake reflects what was known at that point in time.
 */
export async function getSessionWithComparison(sessionId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id: sessionId },
    include: {
      counts: { include: { product: true } },
      createdByUser: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!session) return null;

  const previous = await findPreviousSession(session);

  // Same effectiveBoundary reasoning as differenceAgainstPrevious above.
  const sold = previous
    ? await soldQuantityByProduct(effectiveBoundary(previous), effectiveBoundary(session))
    : new Map<string, number>();
  const previousCounts = new Map(previous?.counts.map((c) => [c.productId, c.quantity]) ?? []);

  const rows = session.counts.map((c) => {
    const previousCount = previousCounts.get(c.productId) ?? null;
    const soldQty = sold.get(c.productId) ?? 0;
    const expectedStock = previousCount !== null ? previousCount - soldQty : null;
    const difference = expectedStock !== null ? c.quantity - expectedStock : null;

    return {
      productName: c.product.name,
      color: c.product.color,
      category: c.product.category,
      previousCount,
      soldSincePrevious: previous ? soldQty : null,
      expectedStock,
      count: c.quantity,
      difference,
    };
  });

  return { session, rows };
}
