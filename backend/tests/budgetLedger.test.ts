import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/db/prisma";
import { resetDb } from "./helpers/resetDb";
import { createEmployeeGroup, createEmployee } from "./helpers/factories";
import {
  ensureBaseGrant,
  runAnnualGrantJob,
  getGrantStatusForCurrentCycle,
  createManualAdjustment,
  getBalanceEur,
  NegativeBalanceError,
} from "../src/services/budgetLedger";

beforeEach(resetDb);

describe("ensureBaseGrant", () => {
  it("does not grant before month 2 (probation period)", async () => {
    const group = await createEmployeeGroup({ baseBudgetEur: 500 });
    const hireDate = new Date(Date.UTC(2026, 6, 1)); // 1 Jul 2026
    const user = await createEmployee(group.id, { hireDate });

    await ensureBaseGrant(user.id, new Date(Date.UTC(2026, 7, 1))); // 1 Aug 2026, still month 1

    expect(await getBalanceEur(user.id)).toBe(0);
  });

  it("grants the base budget once month 2 is reached", async () => {
    const group = await createEmployeeGroup({ baseBudgetEur: 500 });
    const hireDate = new Date(Date.UTC(2026, 6, 1)); // 1 Jul 2026
    const user = await createEmployee(group.id, { hireDate });

    await ensureBaseGrant(user.id, new Date(Date.UTC(2026, 8, 1))); // 1 Sep 2026 -> hireDate + 2 months

    expect(await getBalanceEur(user.id)).toBe(500);
  });

  it("is idempotent — calling it twice does not double-grant", async () => {
    const group = await createEmployeeGroup({ baseBudgetEur: 500 });
    const user = await createEmployee(group.id, { hireDate: new Date(Date.UTC(2026, 6, 1)) });
    const referenceDate = new Date(Date.UTC(2026, 8, 1));

    await ensureBaseGrant(user.id, referenceDate);
    await ensureBaseGrant(user.id, referenceDate);

    expect(await getBalanceEur(user.id)).toBe(500);
  });
});

describe("runAnnualGrantJob / getGrantStatusForCurrentCycle", () => {
  it("grants a prorated amount for a Jan-Jun hire's first July 1st", async () => {
    const group = await createEmployeeGroup({ annualBudgetEur: 240 });
    // Hired in March -> 4/12 of the annual budget, per docs/budget-rules.md.
    const user = await createEmployee(group.id, { hireDate: new Date(Date.UTC(2026, 2, 10)) });

    const result = await runAnnualGrantJob(new Date(Date.UTC(2026, 6, 1)));

    expect(result.grantedCount).toBe(1);
    expect(await getBalanceEur(user.id)).toBe(80); // 240 * 4/12
  });

  it("withholds the full grant for a Jul-Dec hire until next year's July 1st", async () => {
    const group = await createEmployeeGroup({ annualBudgetEur: 240 });
    const user = await createEmployee(group.id, { hireDate: new Date(Date.UTC(2026, 6, 15)) });

    const sameYear = await runAnnualGrantJob(new Date(Date.UTC(2026, 6, 20)));
    expect(sameYear.grantedCount).toBe(0);
    expect(await getBalanceEur(user.id)).toBe(0);

    const nextYear = await runAnnualGrantJob(new Date(Date.UTC(2027, 6, 1)));
    expect(nextYear.grantedCount).toBe(1);
    expect(await getBalanceEur(user.id)).toBe(240); // full amount, not prorated
  });

  it("is idempotent across repeated runs for the same cycle", async () => {
    const group = await createEmployeeGroup({ annualBudgetEur: 200 });
    const user = await createEmployee(group.id, { hireDate: new Date(Date.UTC(2024, 1, 1)) });
    const referenceDate = new Date(Date.UTC(2026, 6, 1));

    const first = await runAnnualGrantJob(referenceDate);
    const balanceAfterFirst = await getBalanceEur(user.id);
    expect(first.grantedCount).toBeGreaterThan(0);

    const second = await runAnnualGrantJob(referenceDate);

    expect(second.grantedCount).toBe(0);
    expect(await getBalanceEur(user.id)).toBe(balanceAfterFirst);
  });

  it("lists an employee as due for the current cycle only once they've reached it", async () => {
    const group = await createEmployeeGroup();
    // Hired this month -> not due until next year, per docs/budget-rules.md.
    await createEmployee(group.id, { hireDate: new Date(Date.UTC(2026, 6, 22)) });

    const status = await getGrantStatusForCurrentCycle(new Date(Date.UTC(2026, 6, 22)));

    expect(status).toHaveLength(0);
  });
});

describe("createManualAdjustment", () => {
  it("refuses to push a balance below zero", async () => {
    const group = await createEmployeeGroup();
    const user = await createEmployee(group.id);
    const admin = await createEmployee(group.id, { employeeNumber: "admin-1" });

    await expect(createManualAdjustment(user.id, -50, "Testkorrektur", admin.id)).rejects.toThrow(
      NegativeBalanceError
    );
    expect(await getBalanceEur(user.id)).toBe(0);
  });

  it("allows a negative adjustment that stays at or above zero", async () => {
    const group = await createEmployeeGroup();
    const user = await createEmployee(group.id);
    const admin = await createEmployee(group.id, { employeeNumber: "admin-2" });
    await createManualAdjustment(user.id, 100, "Grundlage", admin.id);

    await createManualAdjustment(user.id, -100, "Auf null korrigieren", admin.id);

    expect(await getBalanceEur(user.id)).toBe(0);
  });
});
