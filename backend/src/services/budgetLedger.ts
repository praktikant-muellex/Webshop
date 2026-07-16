import { LedgerEntryType, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

/** True for Prisma's "unique constraint violated" error (P2002). */
function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * All budget math lives here. The running balance is never stored as a
 * mutable number anywhere — it is always SUM(amountEur) over a user's
 * budget_ledger_entries. See docs/budget-rules.md for the business rules
 * this code implements.
 */

export async function getBalanceEur(userId: string): Promise<number> {
  const result = await prisma.budgetLedgerEntry.aggregate({
    where: { userId },
    _sum: { amountEur: true },
  });
  return result._sum.amountEur ?? 0;
}

export async function getLedger(userId: string) {
  return prisma.budgetLedgerEntry.findMany({
    where: { userId },
    orderBy: { effectiveDate: "asc" },
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Grundausstattungsbudget unlocks 4 months after hire (end of the 3-month
 * probation period). Lazily checked/materialized — safe to call repeatedly
 * (e.g. on every login) since it's guarded by an existence check.
 */
export async function ensureBaseGrant(userId: string, referenceDate: Date = new Date()): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employeeGroup: true },
  });
  if (!user || !user.employeeGroup || !user.hireDate) return;
  if (user.employmentStatus !== "active") return;

  const eligibleFrom = toDateOnly(addMonths(user.hireDate, 4));
  if (toDateOnly(referenceDate) < eligibleFrom) return;

  const existing = await prisma.budgetLedgerEntry.findFirst({
    where: { userId, entryType: LedgerEntryType.base_grant },
  });
  if (existing) return;

  try {
    await prisma.budgetLedgerEntry.create({
      data: {
        userId,
        entryType: LedgerEntryType.base_grant,
        amountEur: user.employeeGroup.baseBudgetEur,
        effectiveDate: eligibleFrom,
        note: `Grundausstattungsbudget freigeschaltet (Monat 4 ab Einstellung ${user.hireDate.toISOString().slice(0, 10)}).`,
      },
    });
  } catch (err) {
    // Two concurrent requests (e.g. /auth/me and /budget/me firing close
    // together) can both pass the existence check above before either
    // commits; the partial unique index on (userId) WHERE entryType =
    // 'base_grant' lets exactly one insert succeed. Losing this race is the
    // expected, harmless outcome — the grant exists either way.
    if (!isUniqueConstraintError(err)) throw err;
  }
}

/** Jan=0 .. Jun=5 (0-indexed month). Matches the "Eintritt im März -> 4/12" example. */
function proratedMonthsForFirstYear(hireDate: Date): number {
  const hireMonth = hireDate.getUTCMonth();
  return 6 - hireMonth;
}

function july1Of(year: number): Date {
  return new Date(Date.UTC(year, 6, 1));
}

/**
 * Computes every July-1 grant date that is due (<= referenceDate) for a
 * given hire date, along with whether that date's grant is the prorated
 * first-year grant or a full annual grant.
 */
function dueAnnualGrantDates(
  hireDate: Date,
  referenceDate: Date
): Array<{ effectiveDate: Date; prorated: boolean }> {
  const hireYear = hireDate.getUTCFullYear();
  const hireMonth = hireDate.getUTCMonth();

  // Hires Jan-Jun get a prorated grant the same year's July 1.
  // Hires Jul-Dec get their first *full* grant the following year's July 1.
  const firstGrantYear = hireMonth <= 5 ? hireYear : hireYear + 1;
  const firstIsProrated = hireMonth <= 5;

  const dates: Array<{ effectiveDate: Date; prorated: boolean }> = [];
  let year = firstGrantYear;
  while (july1Of(year) <= toDateOnly(referenceDate)) {
    dates.push({ effectiveDate: july1Of(year), prorated: firstIsProrated && year === firstGrantYear });
    year += 1;
  }
  return dates;
}

/**
 * Daily-run job: for every active employee, inserts any annual Folgebudget
 * grant (prorated first year, full every year after) that is due as of
 * referenceDate and not yet recorded. Idempotent — safe to re-run, including
 * as a manual admin-triggered catch-up after a hire-date correction.
 */
export async function runAnnualGrantJob(referenceDate: Date = new Date()) {
  const users = await prisma.user.findMany({
    where: { employmentStatus: "active", hireDate: { not: null } },
    include: { employeeGroup: true },
  });

  let grantedCount = 0;

  for (const user of users) {
    if (!user.employeeGroup || !user.hireDate) continue;
    const due = dueAnnualGrantDates(user.hireDate, referenceDate);

    for (const { effectiveDate, prorated } of due) {
      const existing = await prisma.budgetLedgerEntry.findFirst({
        where: {
          userId: user.id,
          effectiveDate,
          entryType: { in: [LedgerEntryType.annual_grant, LedgerEntryType.annual_grant_prorated] },
        },
      });
      if (existing) continue;

      const fullAmount = user.employeeGroup.annualBudgetEur;
      try {
        if (prorated) {
          const months = proratedMonthsForFirstYear(user.hireDate);
          const amount = Math.round((fullAmount * months) / 12);
          await prisma.budgetLedgerEntry.create({
            data: {
              userId: user.id,
              entryType: LedgerEntryType.annual_grant_prorated,
              amountEur: amount,
              effectiveDate,
              note: `Anteiliges Folgebudget ${months}/12 (Einstellung ${user.hireDate.toISOString().slice(0, 10)}, Stichtag 30. Juni).`,
            },
          });
        } else {
          await prisma.budgetLedgerEntry.create({
            data: {
              userId: user.id,
              entryType: LedgerEntryType.annual_grant,
              amountEur: fullAmount,
              effectiveDate,
              note: `Jährliches Folgebudget zum 1. Juli ${effectiveDate.getUTCFullYear()}.`,
            },
          });
        }
      } catch (err) {
        // Same race as ensureBaseGrant: the cron run and a manual "Jetzt
        // ausführen" click could overlap. The partial unique index on
        // (userId, effectiveDate) makes losing that race a no-op instead of
        // a duplicate grant.
        if (!isUniqueConstraintError(err)) throw err;
        continue;
      }
      grantedCount += 1;
    }
  }

  return { grantedCount };
}

export async function getGrantStatusForCurrentCycle(referenceDate: Date = new Date()) {
  const currentCycleJuly1 =
    referenceDate.getUTCMonth() >= 6
      ? july1Of(referenceDate.getUTCFullYear())
      : july1Of(referenceDate.getUTCFullYear() - 1);

  const users = await prisma.user.findMany({
    where: { employmentStatus: "active", hireDate: { not: null, lte: referenceDate } },
    include: { employeeGroup: true },
  });

  const results = [];
  for (const user of users) {
    if (!user.hireDate) continue;
    const due = dueAnnualGrantDates(user.hireDate, referenceDate).find(
      (d) => d.effectiveDate.getTime() === currentCycleJuly1.getTime()
    );
    if (!due) continue; // not yet eligible for this cycle at all
    const existing = await prisma.budgetLedgerEntry.findFirst({
      where: {
        userId: user.id,
        effectiveDate: currentCycleJuly1,
        entryType: { in: [LedgerEntryType.annual_grant, LedgerEntryType.annual_grant_prorated] },
      },
    });
    results.push({
      userId: user.id,
      email: user.email,
      granted: !!existing,
      cycleJuly1: currentCycleJuly1,
    });
  }
  return results;
}
