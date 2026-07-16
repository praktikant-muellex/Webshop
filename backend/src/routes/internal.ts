import { Router, Request, Response, NextFunction } from "express";
import { runAnnualGrantJob } from "../services/budgetLedger";
import { seedCatalog } from "../services/seedCatalog";

export const internalRouter = Router();

/**
 * Shared secret instead of a user session: these endpoints are called by
 * automation (GitHub Actions) or as a one-off maintenance action on a
 * Render free-tier deploy that has no Shell access, not by a logged-in admin.
 */
function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.header("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Ungültiges oder fehlendes Secret." });
  }
  next();
}

/** Triggered by .github/workflows/annual-grant.yml instead of a paid Render Cron Job. */
internalRouter.post("/run-annual-grant", requireCronSecret, async (_req, res) => {
  const result = await runAnnualGrantJob();
  res.json(result);
});

/**
 * One-off catalog load for environments without Shell access (Render free
 * tier). Idempotent — safe to call again after fixing a seed data typo.
 */
internalRouter.post("/seed", requireCronSecret, async (_req, res) => {
  const result = await seedCatalog();
  res.json(result);
});
