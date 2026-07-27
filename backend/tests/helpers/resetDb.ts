import { prisma } from "../../src/db/prisma";

/**
 * Wipes every table these tests touch, in FK-safe order. Runs before each
 * test so tests never depend on (or leak into) each other's data — this
 * only ever runs against DATABASE_URL from .env.test, never a real database.
 */
export async function resetDb() {
  // Belt-and-braces: this wipes every row in these tables, so refuse to run
  // unless DATABASE_URL is unmistakably a test database — a misconfigured
  // env pointing at dev/prod data must fail loudly here, not silently
  // truncate it.
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) {
    throw new Error(`resetDb() refused: DATABASE_URL does not look like a test database (${url}).`);
  }

  await prisma.$transaction([
    prisma.budgetLedgerEntry.deleteMany(),
    prisma.order.deleteMany(),
    prisma.loanerRecord.deleteMany(),
    prisma.inventorySession.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
    prisma.employeeGroup.deleteMany(),
  ]);
}
