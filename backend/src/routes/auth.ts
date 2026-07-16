import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureBaseGrant } from "../services/budgetLedger";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort erforderlich." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Ungültige Anmeldedaten." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Ungültige Anmeldedaten." });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId! },
    include: { employeeGroup: true },
  });
  if (!user) {
    return res.status(401).json({ error: "Nicht angemeldet." });
  }

  if (user.role === "employee") {
    await ensureBaseGrant(user.id);
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    employeeGroup: user.employeeGroup,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
  });
});
