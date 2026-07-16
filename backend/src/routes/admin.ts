import { Router } from "express";
import bcrypt from "bcryptjs";
import { EmploymentStatus, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/auth";
import { getBalanceEur, getLedger, runAnnualGrantJob, getGrantStatusForCurrentCycle } from "../services/budgetLedger";
import {
  approveOrder,
  rejectOrder,
  updateOrderStatus,
  flagOrdersForReclaim,
  InsufficientBalanceError,
  OrderNotPendingError,
} from "../services/orderApproval";

export const adminRouter = Router();

const staffOnly = requireRole("admin", "supervisor");
const adminOnly = requireRole("admin");

const VALID_ORDER_STATUSES = new Set(Object.values(OrderStatus));
const VALID_EMPLOYMENT_STATUSES = new Set(Object.values(EmploymentStatus));

async function findEmployeeOr404(id: string) {
  return prisma.user.findFirst({ where: { id, role: "employee" } });
}

// --- Employees -------------------------------------------------------------

adminRouter.get("/employees", staffOnly, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: "employee" },
    include: { employeeGroup: true },
    orderBy: { email: "asc" },
  });

  const withBalances = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      email: u.email,
      employeeGroup: u.employeeGroup,
      hireDate: u.hireDate,
      employmentStatus: u.employmentStatus,
      resignationDate: u.resignationDate,
      balanceEur: await getBalanceEur(u.id),
    }))
  );

  res.json(withBalances);
});

adminRouter.get("/employees/:id/ledger", staffOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });

  const [balanceEur, ledger] = await Promise.all([
    getBalanceEur(req.params.id),
    getLedger(req.params.id),
  ]);
  res.json({ balanceEur, ledger });
});

adminRouter.post("/employees/:id/adjustments", adminOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });

  const { amountEur, note } = req.body ?? {};
  if (typeof amountEur !== "number" || !Number.isFinite(amountEur) || !Number.isInteger(amountEur)) {
    return res.status(400).json({ error: "amountEur muss eine ganze Zahl sein." });
  }
  if (amountEur === 0 || !note || typeof note !== "string" || !note.trim()) {
    return res.status(400).json({ error: "amountEur (ungleich 0) und note erforderlich." });
  }

  const entry = await prisma.budgetLedgerEntry.create({
    data: {
      userId: req.params.id,
      entryType: "manual_adjustment",
      amountEur,
      effectiveDate: new Date(),
      note,
      createdByUserId: req.session.userId!,
    },
  });

  res.status(201).json(entry);
});

adminRouter.post("/employees", adminOnly, async (req, res) => {
  const { email, password, employeeGroupCode, hireDate, role } = req.body ?? {};
  if (!email || !password || !employeeGroupCode || !hireDate) {
    return res.status(400).json({ error: "email, password, employeeGroupCode und hireDate erforderlich." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen lang sein." });
  }
  if (Number.isNaN(new Date(hireDate).getTime())) {
    return res.status(400).json({ error: "hireDate ist kein gültiges Datum." });
  }

  const group = await prisma.employeeGroup.findUnique({ where: { code: employeeGroupCode } });
  if (!group) {
    return res.status(400).json({ error: `Unbekannte Mitarbeitergruppe: ${employeeGroupCode}` });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role === "admin" || role === "supervisor" ? role : "employee",
        employeeGroupId: group.id,
        hireDate: new Date(hireDate),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: `E-Mail ${email} ist bereits vergeben.` });
    }
    throw err;
  }

  const dueBy = new Date(user.hireDate!);
  dueBy.setUTCMonth(dueBy.getUTCMonth() + 3);
  await prisma.loanerRecord.create({
    data: { userId: user.id, issuedAt: user.hireDate!, dueBy },
  });

  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

adminRouter.patch("/employees/:id", adminOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });

  const { employeeGroupCode, employmentStatus, resignationDate } = req.body ?? {};
  const data: Record<string, unknown> = {};

  if (employeeGroupCode) {
    const group = await prisma.employeeGroup.findUnique({ where: { code: employeeGroupCode } });
    if (!group) return res.status(400).json({ error: `Unbekannte Mitarbeitergruppe: ${employeeGroupCode}` });
    data.employeeGroupId = group.id;
  }
  if (employmentStatus) {
    if (!VALID_EMPLOYMENT_STATUSES.has(employmentStatus)) {
      return res.status(400).json({ error: `Unbekannter employmentStatus: ${employmentStatus}` });
    }
    data.employmentStatus = employmentStatus;
  }
  if (resignationDate) {
    const parsed = new Date(resignationDate);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "resignationDate ist kein gültiges Datum." });
    }
    data.resignationDate = parsed;
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data });

  if (employmentStatus === "resigned" && user.resignationDate) {
    await flagOrdersForReclaim(user.id, user.resignationDate);
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    employeeGroupId: user.employeeGroupId,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
    resignationDate: user.resignationDate,
  });
});

// --- Orders ------------------------------------------------------------

adminRouter.get("/orders", staffOnly, async (req, res) => {
  const { employeeId, status, dateFrom, dateTo } = req.query;
  const where: Record<string, unknown> = {};

  if (employeeId && typeof employeeId === "string") where.userId = employeeId;
  if (status && typeof status === "string") {
    if (!VALID_ORDER_STATUSES.has(status as OrderStatus)) {
      return res.status(400).json({ error: `Unbekannter Status: ${status}` });
    }
    where.status = status as OrderStatus;
  }
  if (dateFrom || dateTo) {
    const gte = dateFrom ? new Date(dateFrom as string) : undefined;
    const lte = dateTo ? new Date(dateTo as string) : undefined;
    if ((gte && Number.isNaN(gte.getTime())) || (lte && Number.isNaN(lte.getTime()))) {
      return res.status(400).json({ error: "dateFrom/dateTo ist kein gültiges Datum." });
    }
    where.submittedAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  res.json(orders);
});

adminRouter.post("/orders/:id/approve", staffOnly, async (req, res) => {
  try {
    const order = await approveOrder(req.params.id, req.session.userId!);
    res.json(order);
  } catch (err) {
    if (err instanceof InsufficientBalanceError) return res.status(409).json({ error: err.message });
    if (err instanceof OrderNotPendingError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

adminRouter.post("/orders/:id/reject", staffOnly, async (req, res) => {
  const { reason } = req.body ?? {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "reason erforderlich." });
  }
  try {
    const order = await rejectOrder(req.params.id, req.session.userId!, reason);
    res.json(order);
  } catch (err) {
    if (err instanceof OrderNotPendingError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

adminRouter.patch("/orders/:id/status", staffOnly, async (req, res) => {
  const { status } = req.body ?? {};
  if (status !== "ready_for_pickup" && status !== "issued") {
    return res.status(400).json({ error: "status muss 'ready_for_pickup' oder 'issued' sein." });
  }
  const order = await updateOrderStatus(req.params.id, status);
  res.json(order);
});

// --- Budget automation ---------------------------------------------------

adminRouter.post("/budget/run-annual-grant", adminOnly, async (_req, res) => {
  const result = await runAnnualGrantJob();
  res.json(result);
});

adminRouter.get("/budget/grant-status", adminOnly, async (_req, res) => {
  const result = await getGrantStatusForCurrentCycle();
  res.json(result);
});
