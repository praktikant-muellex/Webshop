import { prisma } from "../db/prisma";

export class InvalidOrderItemsError extends Error {}

export const MAX_ITEMS_PER_ORDER = 50;
export const MAX_QUANTITY_PER_ITEM = 20;

export interface OrderItemInput {
  productId: string;
  sizeLabel?: string;
  quantity?: number;
}

export interface PricedOrderItem {
  productId: string;
  sizeLabel: string | null;
  unitPriceEur: number;
  quantity: number;
}

/**
 * Shared by order submission (routes/orders.ts) and the admin order-item
 * edit endpoint (routes/admin.ts) so both go through the same productId/
 * size/quantity checks and always price a line from the product's *current*
 * price rather than trusting a client-supplied amount.
 */
export async function validateAndPriceItems(items: unknown): Promise<PricedOrderItem[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new InvalidOrderItemsError("Bestellung benötigt mindestens eine Position.");
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new InvalidOrderItemsError(`Maximal ${MAX_ITEMS_PER_ORDER} Positionen pro Bestellung.`);
  }
  const typedItems = items as OrderItemInput[];
  for (const item of typedItems) {
    if (typeof item.productId !== "string" || !item.productId) {
      throw new InvalidOrderItemsError("Jede Position braucht eine productId.");
    }
    if (
      item.quantity !== undefined &&
      (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY_PER_ITEM)
    ) {
      throw new InvalidOrderItemsError(`Menge muss zwischen 1 und ${MAX_QUANTITY_PER_ITEM} liegen.`);
    }
  }

  const productIds = typedItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { sizes: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return typedItems.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new InvalidOrderItemsError(`Produkt ${item.productId} nicht gefunden.`);
    }
    if (product.sizes.length > 0) {
      const validSize = product.sizes.some((s) => s.sizeLabel === item.sizeLabel);
      if (!validSize) {
        throw new InvalidOrderItemsError(`Ungültige Größe für Produkt "${product.name}".`);
      }
    }
    return {
      productId: product.id,
      sizeLabel: item.sizeLabel ?? null,
      unitPriceEur: product.priceEur,
      quantity: item.quantity ?? 1,
    };
  });
}
