import { Router } from "express";
import { runAnnualGrantJob } from "../services/budgetLedger";

export const internalRouter = Router();

/**
 * Triggered by a scheduled GitHub Actions workflow (see
 * .github/workflows/annual-grant.yml) instead of a paid Render Cron Job.
 * Protected by a shared secret header rather than a user session, since
 * there is no logged-in admin to authenticate as.
 */
internalRouter.post("/run-annual-grant", async (req, res) => {
  const secret = req.header("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Ungültiges oder fehlendes Secret." });
  }

  const result = await runAnnualGrantJob();
  res.json(result);
});
