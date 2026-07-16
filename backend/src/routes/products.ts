import { Router } from "express";
import { ProductCategory } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";

export const productsRouter = Router();

const VALID_CATEGORIES = new Set(Object.values(ProductCategory));

productsRouter.get("/", requireAuth, async (req, res) => {
  const { mandatoryForMe, category } = req.query;

  const where: Record<string, unknown> = { active: true };

  if (category && typeof category === "string") {
    if (!VALID_CATEGORIES.has(category as ProductCategory)) {
      return res.status(400).json({ error: `Unbekannte Kategorie: ${category}` });
    }
    where.category = category as ProductCategory;
  }

  if (mandatoryForMe === "true") {
    const user = await prisma.user.findUnique({ where: { id: req.session.userId! } });
    if (!user?.employeeGroupId) {
      return res.json([]);
    }
    where.mandatoryForGroupId = user.employeeGroupId;
  }

  const products = await prisma.product.findMany({
    where,
    include: { sizes: { orderBy: { sortOrder: "asc" } }, mandatoryForGroup: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  res.json(products);
});

productsRouter.get("/:id", requireAuth, async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { sizes: { orderBy: { sortOrder: "asc" } }, mandatoryForGroup: true },
  });
  if (!product) {
    return res.status(404).json({ error: "Produkt nicht gefunden." });
  }
  res.json(product);
});
