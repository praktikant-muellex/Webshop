import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { updateOrderStatus, InvalidStatusTransitionError } from "../services/orderApproval";
import { validateAndPriceItems, InvalidOrderItemsError } from "../services/orderItems";

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, async (req, res) => {
  let items;
  try {
    items = await validateAndPriceItems(req.body?.items);
  } catch (err) {
    if (err instanceof InvalidOrderItemsError) return res.status(400).json({ error: err.message });
    throw err;
  }

  const order = await prisma.order.create({
    data: {
      userId: req.session.userId!,
      items: { create: items },
    },
    include: { items: { include: { product: true } } },
  });

  res.status(201).json(order);
});

ordersRouter.get("/me", requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.session.userId! },
    include: { items: { include: { product: true } } },
    orderBy: { submittedAt: "desc" },
  });
  res.json(orders);
});

ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  });
  if (!order) {
    return res.status(404).json({ error: "Bestellung nicht gefunden." });
  }

  if (order.userId !== req.session.userId!) {
    const requester = await prisma.user.findUnique({ where: { id: req.session.userId! } });
    if (!requester || (requester.role !== "admin" && requester.role !== "supervisor")) {
      return res.status(403).json({ error: "Keine Berechtigung." });
    }
  }

  res.json(order);
});

/**
 * The employee's own confirmation that they physically picked up the
 * order — the ready_for_pickup -> issued transition, previously only an
 * admin action (PATCH /admin/orders/:id/status). Restricted to the order's
 * owner (not staff) precisely because the point is that the person who
 * actually took the goods says so themselves; staff can still fall back to
 * the admin-side action if an employee can't/doesn't do it themselves.
 */
ordersRouter.post("/:id/confirm-pickup", requireAuth, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    return res.status(404).json({ error: "Bestellung nicht gefunden." });
  }
  if (order.userId !== req.session.userId!) {
    return res.status(403).json({ error: "Keine Berechtigung." });
  }

  try {
    const updated = await updateOrderStatus(order.id, "issued");
    res.json(updated);
  } catch (err) {
    if (err instanceof InvalidStatusTransitionError) {
      return res.status(409).json({ error: "Bestellung ist nicht (mehr) abholbereit." });
    }
    throw err;
  }
});
