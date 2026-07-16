import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";

export const ordersRouter = Router();

interface OrderItemInput {
  productId: string;
  sizeLabel?: string;
  quantity?: number;
}

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QUANTITY_PER_ITEM = 20;

ordersRouter.post("/", requireAuth, async (req, res) => {
  const items: OrderItemInput[] = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Bestellung benötigt mindestens eine Position." });
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return res.status(400).json({ error: `Maximal ${MAX_ITEMS_PER_ORDER} Positionen pro Bestellung.` });
  }
  for (const item of items) {
    if (
      item.quantity !== undefined &&
      (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY_PER_ITEM)
    ) {
      return res.status(400).json({ error: `Menge muss zwischen 1 und ${MAX_QUANTITY_PER_ITEM} liegen.` });
    }
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { sizes: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      return res.status(400).json({ error: `Produkt ${item.productId} nicht gefunden.` });
    }
    if (product.sizes.length > 0) {
      const validSize = product.sizes.some((s) => s.sizeLabel === item.sizeLabel);
      if (!validSize) {
        return res.status(400).json({ error: `Ungültige Größe für Produkt "${product.name}".` });
      }
    }
  }

  const order = await prisma.order.create({
    data: {
      userId: req.session.userId!,
      items: {
        create: items.map((item) => {
          const product = productById.get(item.productId)!;
          return {
            productId: product.id,
            sizeLabel: item.sizeLabel ?? null,
            unitPriceEur: product.priceEur,
            quantity: item.quantity ?? 1,
          };
        }),
      },
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
