import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getBalanceEur, getLedger, ensureBaseGrant } from "../services/budgetLedger";

export const budgetRouter = Router();

budgetRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  await ensureBaseGrant(userId);
  const [balanceEur, ledger] = await Promise.all([getBalanceEur(userId), getLedger(userId)]);
  res.json({ balanceEur, ledger });
});
