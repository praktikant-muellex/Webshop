-- Prevents a race between two concurrent requests (e.g. two nearly-
-- simultaneous /auth/me or /budget/me calls, or the cron job overlapping
-- with a manual "Jetzt ausführen") both seeing "no grant yet" and each
-- inserting one. The application still checks first (for the common case
-- and a clean error path); these indexes are the actual guarantee.

-- Only one base_grant ledger row per user, ever.
CREATE UNIQUE INDEX "budget_ledger_base_grant_unique"
  ON "budget_ledger_entries" ("userId")
  WHERE "entryType" = 'base_grant';

-- Only one annual grant (prorated or full) per user per July-1 cycle.
CREATE UNIQUE INDEX "budget_ledger_annual_grant_unique"
  ON "budget_ledger_entries" ("userId", "effectiveDate")
  WHERE "entryType" IN ('annual_grant', 'annual_grant_prorated');
