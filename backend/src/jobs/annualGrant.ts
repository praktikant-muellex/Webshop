import "dotenv/config";
import { runAnnualGrantJob } from "../services/budgetLedger";
import { prisma } from "../db/prisma";

/**
 * Entrypoint for the daily scheduled job (Render Cron Job runs this via
 * `npm run grant:run`). Also callable ad-hoc for local testing.
 */
async function main() {
  const result = await runAnnualGrantJob();
  console.log(`Jährliches Folgebudget: ${result.grantedCount} Ledger-Einträge angelegt.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
