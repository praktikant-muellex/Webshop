import { Router, Request } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { ensureBaseGrant } from "../services/budgetLedger";

export const authRouter = Router();

/**
 * Issues a fresh session ID on login instead of just mutating the existing
 * session's userId. Without this, a session cookie an attacker managed to
 * plant in a victim's browser before login (XSS, subdomain cookie tossing)
 * would still be valid — and now authenticated as the victim — after they
 * log in through it, since the underlying session ID never changed.
 */
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

// Login is the one endpoint an attacker can hit without already being
// authenticated, so it's the one worth throttling against brute force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen." },
});

/**
 * Employee accounts have no password — a fixed per-IP limit alone leaves a
 * gap: employeeNumber is a short, unformatted string (plain 4-digit numbers
 * in practice), so someone who already knows a coworker's name could spread
 * guesses across several source IPs to dodge `loginLimiter` entirely and
 * still only need to search a small number space for one specific account.
 * This limiter closes that gap by keying on the *employeeNumber being
 * guessed* instead of the caller's IP, so the same account can't be brute-
 * forced quickly regardless of how many IPs the attempts come from.
 */
const employeeAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.employeeNumber ?? "").trim().toLowerCase() || "unknown",
  message: { error: "Zu viele Anmeldeversuche für diese Personalnummer. Bitte in 15 Minuten erneut versuchen." },
});

/** Admin/supervisor login — unchanged, email + password. */
authRouter.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
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

  if (user.employmentStatus === "resigned") {
    return res.status(403).json({ error: "Dieses Konto ist nicht mehr aktiv." });
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, role: user.role });
});

/**
 * Employee login — name + Personalnummer instead of email + password.
 * employeeNumber is looked up directly (it's a unique, plaintext staff ID,
 * not a hash — see the schema comment on User.employeeNumber), then
 * firstName/lastName must also match what's on file. Requiring both is
 * mostly a UX/typo-catching measure: employeeNumber alone already
 * identifies the account uniquely.
 */
authRouter.post("/employee-login", loginLimiter, employeeAccountLimiter, async (req, res) => {
  const { firstName, lastName, employeeNumber } = req.body ?? {};
  if (!firstName || !lastName || !employeeNumber) {
    return res.status(400).json({ error: "Vorname, Nachname und Personalnummer erforderlich." });
  }

  const user = await prisma.user.findUnique({ where: { employeeNumber: String(employeeNumber).trim() } });
  const nameMatches =
    user &&
    user.firstName?.trim().toLowerCase() === String(firstName).trim().toLowerCase() &&
    user.lastName?.trim().toLowerCase() === String(lastName).trim().toLowerCase();

  if (!user || !nameMatches || user.role !== "employee") {
    return res.status(401).json({ error: "Ungültige Anmeldedaten." });
  }
  if (user.employmentStatus === "resigned") {
    return res.status(403).json({ error: "Dieses Konto ist nicht mehr aktiv." });
  }

  await regenerateSession(req);
  req.session.userId = user.id;
  res.json({ id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role });
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
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    employeeNumber: user.employeeNumber,
    role: user.role,
    employeeGroup: user.employeeGroup,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
  });
});
