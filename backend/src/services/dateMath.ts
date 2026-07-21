/**
 * Adds `months` to `date`, clamping the day-of-month to the last valid day
 * of the target month instead of letting it overflow.
 *
 * Plain `date.setUTCMonth(date.getUTCMonth() + months)` silently rolls over
 * when the original day doesn't exist in the target month — e.g. Oct 31 + 4
 * months lands on Mar 3, not the end of February, because JS Date arithmetic
 * treats "Feb 31" as "3 days past the end of February". That shifted the
 * Grundausstattungsbudget unlock date, the 3-month reclaim-window cutoff,
 * and the probation loaner due-by date later than intended for anyone with
 * a hire/resignation date on the 29th-31st of a month.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const firstOfTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(firstOfTargetMonth.getUTCFullYear(), firstOfTargetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  firstOfTargetMonth.setUTCDate(Math.min(day, daysInTargetMonth));
  return firstOfTargetMonth;
}

/**
 * The last instant of `date`'s calendar day (23:59:59.999 UTC).
 *
 * `InventorySession.takenAt` is a `@db.Date` column — Postgres/Prisma always
 * returns it as midnight UTC, with no time-of-day. Using that raw midnight
 * value as a window boundary for "sold since this stocktake" queries means
 * any order approved later that same day (a very ordinary case for a
 * same-day inventory count) falls *after* midnight and gets silently
 * excluded, even though the admin's on-screen "Soll-Bestand" preview (which
 * queries up to the actual current moment, not midnight) already included
 * it. Treating a stocktake date as "the state as of the end of that day"
 * instead closes that gap, for both same-day counts and deliberately
 * back-dated ones.
 */
export function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}
