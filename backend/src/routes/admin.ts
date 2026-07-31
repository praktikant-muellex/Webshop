import { Router } from "express";
import bcrypt from "bcryptjs";
import { EmploymentStatus, OrderStatus, Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireRole } from "../middleware/auth";
import { isForeignKeyViolation } from "../services/prismaErrors";
import {
  getBalanceEur,
  getLedger,
  runAnnualGrantJob,
  getGrantStatusForCurrentCycle,
  createManualAdjustment,
  NegativeBalanceError,
} from "../services/budgetLedger";
import {
  approveOrder,
  rejectOrder,
  updateOrderStatus,
  updateOrderItems,
  flagOrdersForReclaim,
  InsufficientBalanceError,
  OrderNotPendingError,
  InvalidStatusTransitionError,
  EmployeeResignedError,
} from "../services/orderApproval";
import { validateAndPriceItems, InvalidOrderItemsError } from "../services/orderItems";
import { generateReceiptPdf } from "../services/receipt";
import { sendReceiptEmail } from "../services/mailer";
import {
  getInventoryOverview,
  submitInventorySession,
  listInventorySessions,
  getSessionWithComparison,
} from "../services/inventory";
import { generateInventorySessionPdf } from "../services/inventoryReceipt";
import { addMonthsClamped } from "../services/dateMath";
import {
  listAllProducts,
  createProductWithVariants,
  setProductActive,
  deleteProductPermanently,
  ProductHasHistoryError,
} from "../services/productManagement";

export const adminRouter = Router();

const staffOnly = requireRole("admin", "supervisor");
const adminOnly = requireRole("admin");

const VALID_ORDER_STATUSES = new Set(Object.values(OrderStatus));
const VALID_EMPLOYMENT_STATUSES = new Set(Object.values(EmploymentStatus));
const VALID_CATEGORIES = new Set(Object.values(ProductCategory));

// A generous cap on the base64 data: URL string, not the raw file — just
// enough to stop an absurd upload, not a real quality constraint.
const MAX_IMAGE_DATA_URL_LENGTH = 6_000_000;

// Matches the two size systems already used across the real catalog
// (seed/products.json): letter sizes XS through 8XL, or even-number
// clothing sizes (pants etc., always even in German sizing). Mirrors the
// same check in frontend/src/components/AddProductForm.tsx — this is the
// server-side enforcement, since that form's own validation only guards
// against mistakes made through the UI, not a direct API call.
const ALPHA_SIZES = new Set(["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"]);
const MIN_NUMERIC_SIZE = 30;
const MAX_NUMERIC_SIZE = 80;

/** Returns the canonical size label (uppercased letter size, or the trimmed number), or null if not a real size. */
function normalizeSizeLabel(label: string): string | null {
  const trimmed = label.trim();
  const upper = trimmed.toUpperCase();
  if (ALPHA_SIZES.has(upper)) return upper;
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    // String(n), not the raw trimmed text — "044" must normalize to the same
    // "44" as a plain "44" entry, or the two would dedupe as distinct sizes.
    if (n % 2 === 0 && n >= MIN_NUMERIC_SIZE && n <= MAX_NUMERIC_SIZE) return String(n);
  }
  return null;
}

async function findEmployeeOr404(id: string) {
  return prisma.user.findFirst({ where: { id, role: "employee" } });
}

// --- Employees -------------------------------------------------------------

adminRouter.get("/employees", staffOnly, async (req, res) => {
  const includeHidden = req.query.includeHidden === "true";

  const users = await prisma.user.findMany({
    where: { role: "employee", ...(includeHidden ? {} : { hidden: false }) },
    include: { employeeGroup: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const withBalances = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      nickname: u.nickname,
      employeeNumber: u.employeeNumber,
      employeeGroup: u.employeeGroup,
      hireDate: u.hireDate,
      employmentStatus: u.employmentStatus,
      resignationDate: u.resignationDate,
      hidden: u.hidden,
      balanceEur: await getBalanceEur(u.id),
    }))
  );

  res.json(withBalances);
});

adminRouter.get("/employees/:id", staffOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });

  const employeeGroup = employee.employeeGroupId
    ? await prisma.employeeGroup.findUnique({ where: { id: employee.employeeGroupId } })
    : null;

  res.json({
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    nickname: employee.nickname,
    employeeNumber: employee.employeeNumber,
    employeeGroup,
    hireDate: employee.hireDate,
    employmentStatus: employee.employmentStatus,
    resignationDate: employee.resignationDate,
    hidden: employee.hidden,
    balanceEur: await getBalanceEur(employee.id),
  });
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

  try {
    const entry = await createManualAdjustment(req.params.id, amountEur, note, req.session.userId!);
    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof NegativeBalanceError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

adminRouter.post("/employees", adminOnly, async (req, res) => {
  const { firstName, lastName, nickname, employeeNumber, employeeGroupCode, hireDate } = req.body ?? {};
  if (!firstName || !lastName || !employeeNumber || !employeeGroupCode || !hireDate) {
    return res
      .status(400)
      .json({ error: "firstName, lastName, employeeNumber, employeeGroupCode und hireDate erforderlich." });
  }
  if (typeof employeeGroupCode !== "string") {
    return res.status(400).json({ error: "employeeGroupCode muss ein String sein." });
  }
  if (Number.isNaN(new Date(hireDate).getTime())) {
    return res.status(400).json({ error: "hireDate ist kein gültiges Datum." });
  }

  const group = await prisma.employeeGroup.findUnique({ where: { code: employeeGroupCode } });
  if (!group) {
    return res.status(400).json({ error: `Unbekannte Mitarbeitergruppe: ${employeeGroupCode}` });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        nickname: nickname ? String(nickname).trim() : null,
        employeeNumber: String(employeeNumber).trim(),
        role: "employee",
        employeeGroupId: group.id,
        hireDate: new Date(hireDate),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: `Personalnummer ${employeeNumber} ist bereits vergeben.` });
    }
    throw err;
  }

  const dueBy = addMonthsClamped(user.hireDate!, 1);
  await prisma.loanerRecord.create({
    data: { userId: user.id, issuedAt: user.hireDate!, dueBy },
  });

  res.status(201).json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    employeeNumber: user.employeeNumber,
    role: user.role,
  });
});

// --- Admin accounts ---------------------------------------------------------

adminRouter.post("/admins", adminOnly, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email und password erforderlich." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password muss mindestens 8 Zeichen haben." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { email: email.trim().toLowerCase(), passwordHash, role: "admin" },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: `E-Mail ${email} ist bereits vergeben.` });
    }
    throw err;
  }

  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

adminRouter.patch("/employees/:id", adminOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });

  const { employeeGroupCode, employmentStatus, resignationDate, hidden } = req.body ?? {};
  const data: Record<string, unknown> = {};

  if (employeeGroupCode) {
    if (typeof employeeGroupCode !== "string") {
      return res.status(400).json({ error: "employeeGroupCode muss ein String sein." });
    }
    const group = await prisma.employeeGroup.findUnique({ where: { code: employeeGroupCode } });
    if (!group) return res.status(400).json({ error: `Unbekannte Mitarbeitergruppe: ${employeeGroupCode}` });
    data.employeeGroupId = group.id;
  }
  if (employmentStatus) {
    if (!VALID_EMPLOYMENT_STATUSES.has(employmentStatus)) {
      return res.status(400).json({ error: `Unbekannter employmentStatus: ${employmentStatus}` });
    }
    // "Austritt erfassen" is a one-time action, not an editable field — once
    // an employee is resigned, resubmitting it would silently re-run
    // flagOrdersForReclaim against a (possibly different) date, which is a
    // correction workflow this endpoint doesn't otherwise support.
    if (employmentStatus === "resigned" && employee.employmentStatus === "resigned") {
      return res.status(400).json({ error: "Mitarbeiter ist bereits als gekündigt markiert." });
    }
    // Reclaim-flagging (the last-3-months rule) only ever runs off the back
    // of this exact PATCH, keyed on resignationDate — silently accepting
    // "resigned" without one (and none already on file) would skip that
    // business rule with no error shown to the admin.
    if (employmentStatus === "resigned" && !resignationDate && !employee.resignationDate) {
      return res.status(400).json({ error: "resignationDate erforderlich, um als ausgeschieden zu markieren." });
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
  if (typeof hidden !== "undefined") {
    if (typeof hidden !== "boolean") {
      return res.status(400).json({ error: "hidden muss ein Boolean sein." });
    }
    const resolvedStatus = employmentStatus ?? employee.employmentStatus;
    if (hidden && resolvedStatus !== "resigned") {
      return res.status(400).json({ error: "Nur gekündigte Mitarbeiter können aus der Liste entfernt werden." });
    }
    data.hidden = hidden;
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data });

  if (employmentStatus === "resigned" && user.resignationDate) {
    await flagOrdersForReclaim(user.id, user.resignationDate);
  }

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    employeeNumber: user.employeeNumber,
    role: user.role,
    employeeGroupId: user.employeeGroupId,
    hireDate: user.hireDate,
    employmentStatus: user.employmentStatus,
    resignationDate: user.resignationDate,
    hidden: user.hidden,
  });
});

adminRouter.delete("/employees/:id", adminOnly, async (req, res) => {
  const employee = await findEmployeeOr404(req.params.id);
  if (!employee) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });
  if (!employee.hidden) {
    return res.status(400).json({ error: "Mitarbeiter muss zuerst aus der Liste entfernt werden." });
  }

  const [orderCount, decidedOrderCount, ledgerCount, inventoryCount] = await Promise.all([
    prisma.order.count({ where: { userId: employee.id } }),
    prisma.order.count({ where: { decidedByUserId: employee.id } }),
    prisma.budgetLedgerEntry.count({ where: { OR: [{ userId: employee.id }, { createdByUserId: employee.id }] } }),
    prisma.inventorySession.count({ where: { createdByUserId: employee.id } }),
  ]);
  if (orderCount > 0 || decidedOrderCount > 0 || ledgerCount > 0 || inventoryCount > 0) {
    return res.status(409).json({
      error:
        "Mitarbeiter kann nicht endgültig gelöscht werden: es bestehen noch Bestellungen, Guthaben-Buchungen oder Inventur-Einträge dazu.",
    });
  }

  try {
    await prisma.$transaction([
      prisma.loanerRecord.deleteMany({ where: { userId: employee.id } }),
      prisma.user.delete({ where: { id: employee.id } }),
    ]);
  } catch (err) {
    // Belt-and-braces: the counts above cover every FK into this row we know
    // of, but a foreign key violation here means something still references
    // it that we missed — fail loud with a clear message rather than a raw
    // Prisma error.
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({ error: "Mitarbeiter kann nicht endgültig gelöscht werden: es bestehen noch verknüpfte Daten." });
    }
    throw err;
  }

  res.status(204).end();
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
      user: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  res.json(orders);
});

adminRouter.post("/orders/:id/approve", staffOnly, async (req, res) => {
  try {
    const order = await approveOrder(req.params.id, req.session.userId!);
    res.json(order);

    // Best-effort receipt email — approval already succeeded and was
    // reported to the admin above, so nothing from here on may affect the
    // response or roll back anything.
    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } }, user: true, decidedByUser: true },
      });
      if (fullOrder) {
        const pdfBuffer = await generateReceiptPdf(fullOrder);
        await sendReceiptEmail(fullOrder, pdfBuffer);
      }
    } catch (mailErr) {
      console.error("Beleg-E-Mail konnte nicht verschickt werden:", mailErr);
    }
  } catch (err) {
    if (err instanceof InsufficientBalanceError) return res.status(409).json({ error: err.message });
    if (err instanceof OrderNotPendingError) return res.status(409).json({ error: err.message });
    if (err instanceof EmployeeResignedError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

const MAX_REJECTION_REASON_LENGTH = 500;

adminRouter.post("/orders/:id/reject", staffOnly, async (req, res) => {
  const { reason } = req.body ?? {};
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return res.status(400).json({ error: "reason erforderlich." });
  }
  if (reason.trim().length > MAX_REJECTION_REASON_LENGTH) {
    return res.status(400).json({ error: `reason darf maximal ${MAX_REJECTION_REASON_LENGTH} Zeichen lang sein.` });
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
  try {
    const order = await updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (err) {
    if (err instanceof InvalidStatusTransitionError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

/**
 * Corrects a pending order's items (wrong color/size/quantity picked by the
 * employee) before it gets approved. See updateOrderItems for why this is
 * restricted to 'pending' orders.
 */
adminRouter.patch("/orders/:id/items", staffOnly, async (req, res) => {
  try {
    const items = await validateAndPriceItems(req.body?.items);
    const order = await updateOrderItems(req.params.id, items);
    res.json(order);
  } catch (err) {
    if (err instanceof InvalidOrderItemsError) return res.status(400).json({ error: err.message });
    if (err instanceof OrderNotPendingError) return res.status(409).json({ error: err.message });
    throw err;
  }
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

// --- Inventory -----------------------------------------------------------

adminRouter.get("/inventory", staffOnly, async (_req, res) => {
  const overview = await getInventoryOverview();
  res.json(overview);
});

adminRouter.post("/inventory", adminOnly, async (req, res) => {
  const { counts, takenAt } = req.body ?? {};
  // Not requiring non-empty here — if every product is currently inactive,
  // an empty array is the only correct submission (it exactly matches the
  // active set, checked below). Rejecting it outright would make it
  // impossible to ever record a stocktake while the catalog is empty.
  if (!Array.isArray(counts)) {
    return res.status(400).json({ error: "counts (Array) erforderlich." });
  }

  const cleaned: Array<{ productId: string; quantity: number }> = [];
  for (const entry of counts) {
    const { productId, quantity } = entry ?? {};
    if (typeof productId !== "string" || !productId) {
      return res.status(400).json({ error: "Jeder Eintrag braucht eine productId." });
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: `Ungültige Menge für Produkt ${productId}.` });
    }
    cleaned.push({ productId, quantity });
  }

  const productIds = new Set(cleaned.map((c) => c.productId));
  if (productIds.size !== cleaned.length) {
    return res.status(400).json({ error: "Jedes Produkt darf nur einmal vorkommen." });
  }

  // Must cover every currently active product, exactly — not just "these
  // IDs happen to exist". A session that's missing some products (a bug
  // in a future caller, or a direct API call bypassing the form's own
  // "every row filled in" check) would silently become the reference point
  // for the overview's "Letzte Inventur"/"Letzte Differenz" columns, and
  // every product it left out would show blank for anyone viewing the
  // overview afterward, with no indication why.
  const activeProducts = await prisma.product.findMany({ where: { active: true }, select: { id: true } });
  const activeProductIds = new Set(activeProducts.map((p) => p.id));
  const missing = [...activeProductIds].filter((id) => !productIds.has(id));
  const unexpected = [...productIds].filter((id) => !activeProductIds.has(id));
  if (missing.length > 0 || unexpected.length > 0) {
    return res.status(400).json({
      error: `Die Inventur muss genau alle aktiven Produkte umfassen. Fehlend: ${missing.length}, unbekannt/inaktiv: ${unexpected.length}.`,
    });
  }

  let parsedTakenAt: Date | undefined;
  if (takenAt) {
    parsedTakenAt = new Date(takenAt);
    if (Number.isNaN(parsedTakenAt.getTime())) {
      return res.status(400).json({ error: "takenAt ist kein gültiges Datum." });
    }
  }

  const session = await submitInventorySession(cleaned, req.session.userId!, parsedTakenAt);
  res.status(201).json(session);
});

adminRouter.get("/inventory/sessions", staffOnly, async (_req, res) => {
  const sessions = await listInventorySessions();
  res.json(
    sessions.map((s) => ({ id: s.id, takenAt: s.takenAt, createdAt: s.createdAt, createdBy: s.createdByUser }))
  );
});

adminRouter.get("/inventory/sessions/:id/pdf", staffOnly, async (req, res) => {
  const detail = await getSessionWithComparison(req.params.id);
  if (!detail) return res.status(404).json({ error: "Inventur nicht gefunden." });

  const pdfBuffer = await generateInventorySessionPdf(detail.session, detail.rows);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="inventur-${detail.session.takenAt.toISOString().slice(0, 10)}.pdf"`
  );
  res.send(pdfBuffer);
});

// --- Product management ("Waren Managen") ---------------------------------

adminRouter.get("/products", staffOnly, async (req, res) => {
  const { category } = req.query;
  if (category && typeof category === "string" && !VALID_CATEGORIES.has(category as ProductCategory)) {
    return res.status(400).json({ error: `Unbekannte Kategorie: ${category}` });
  }
  const products = await listAllProducts(category && typeof category === "string" ? (category as ProductCategory) : undefined);
  res.json(products);
});

adminRouter.post("/products", adminOnly, async (req, res) => {
  const { name, category, priceEur, sizes, variants } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name erforderlich." });
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.has(category as ProductCategory)) {
    return res.status(400).json({ error: `Unbekannte Kategorie: ${category}` });
  }
  if (typeof priceEur !== "number" || !Number.isFinite(priceEur) || !Number.isInteger(priceEur) || priceEur <= 0) {
    return res.status(400).json({ error: "priceEur muss eine positive ganze Zahl sein." });
  }
  if (!Array.isArray(sizes) || sizes.length === 0 || !sizes.every((s) => typeof s === "string" && s.trim())) {
    return res.status(400).json({ error: "Mindestens eine Größe erforderlich." });
  }
  const normalizedSizes = sizes.map((s: string) => normalizeSizeLabel(s));
  const invalidSizeIndex = normalizedSizes.findIndex((s) => s === null);
  if (invalidSizeIndex !== -1) {
    return res.status(400).json({
      error: `"${sizes[invalidSizeIndex]}" ist keine gültige Größe. Erlaubt sind Buchstabengrößen (XS-8XL) oder gerade Zahlen (${MIN_NUMERIC_SIZE}-${MAX_NUMERIC_SIZE}).`,
    });
  }
  const uniqueSizes = [...new Set(normalizedSizes as string[])];
  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: "Mindestens eine Farbvariante mit Bild erforderlich." });
  }
  for (const v of variants) {
    if (v == null || typeof v !== "object") {
      return res.status(400).json({ error: "Ungültige Farbvariante." });
    }
    if (v.color !== null && v.color !== undefined && typeof v.color !== "string") {
      return res.status(400).json({ error: "Farbe muss ein Text oder leer sein." });
    }
    if (typeof v.imageDataUrl !== "string" || !v.imageDataUrl.startsWith("data:image/")) {
      return res.status(400).json({ error: "Jede Farbvariante braucht ein gültiges Bild." });
    }
    if (v.imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return res.status(400).json({ error: "Bild ist zu groß (max. ca. 4 MB pro Bild)." });
    }
  }
  const normalizedColors = variants.map((v) => (v.color ? String(v.color).trim() : null));
  if (new Set(normalizedColors).size !== normalizedColors.length) {
    return res.status(400).json({ error: "Jede Farbe darf nur einmal vorkommen." });
  }

  try {
    const created = await createProductWithVariants({
      name: name.trim(),
      category: category as ProductCategory,
      priceEur,
      sizes: uniqueSizes,
      variants: variants.map((v, i) => ({ color: normalizedColors[i], imageDataUrl: v.imageDataUrl })),
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "Ein Produkt mit diesem Namen und dieser Farbe existiert bereits." });
    }
    throw err;
  }
});

adminRouter.patch("/products/:id", adminOnly, async (req, res) => {
  const { active } = req.body ?? {};
  if (typeof active !== "boolean") {
    return res.status(400).json({ error: "active (boolean) erforderlich." });
  }
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Produkt nicht gefunden." });

  const product = await setProductActive(req.params.id, active);
  res.json(product);
});

adminRouter.delete("/products/:id", adminOnly, async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Produkt nicht gefunden." });
  if (existing.active) {
    return res.status(400).json({ error: "Produkt muss zuerst entfernt werden." });
  }

  try {
    await deleteProductPermanently(req.params.id);
  } catch (err) {
    if (err instanceof ProductHasHistoryError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }

  res.status(204).end();
});
