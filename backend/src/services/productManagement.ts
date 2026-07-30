import { ProductCategory } from "@prisma/client";
import { prisma } from "../db/prisma";
import { isForeignKeyViolation } from "./prismaErrors";

/**
 * Product photos are stored as data: URLs directly in Product.imageUrl
 * (base64, same field the seeded catalog photos would use a static path in)
 * rather than as files on the backend's own disk. Render's free-tier web
 * service filesystem is ephemeral — anything written there is gone on the
 * next restart/redeploy — but the Postgres database persists reliably, so
 * this is the option that doesn't need a new object-storage service.
 */
export interface ProductVariantInput {
  color: string | null;
  imageDataUrl: string;
}

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  priceEur: number;
  sizes: string[];
  variants: ProductVariantInput[];
}

export async function listAllProducts(category?: ProductCategory) {
  return prisma.product.findMany({
    where: category ? { category } : {},
    include: { sizes: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ category: "asc" }, { name: "asc" }, { color: "asc" }],
  });
}

/**
 * Creates one Product row per color variant (matching how the seeded
 * catalog already models a garment with multiple colors as separate rows
 * sharing a name), each with its own ProductSize rows. Wrapped in a
 * transaction so a duplicate-color collision on variant 2 doesn't leave
 * variant 1 committed on its own.
 */
export async function createProductWithVariants(input: CreateProductInput) {
  return prisma.$transaction(async (tx) => {
    const created = [];
    for (const variant of input.variants) {
      const product = await tx.product.create({
        data: {
          category: input.category,
          name: input.name,
          color: variant.color,
          priceEur: input.priceEur,
          imageUrl: variant.imageDataUrl,
          sizeRangeRaw: input.sizes.join(", "),
          active: true,
          sizes: {
            create: input.sizes.map((label, i) => ({ sizeLabel: label, sortOrder: i })),
          },
        },
        include: { sizes: true },
      });
      created.push(product);
    }
    return created;
  });
}

export async function setProductActive(id: string, active: boolean) {
  return prisma.product.update({ where: { id }, data: { active } });
}

export class ProductHasHistoryError extends Error {}

export async function deleteProductPermanently(id: string): Promise<void> {
  const [orderItemCount, inventoryCountCount] = await Promise.all([
    prisma.orderItem.count({ where: { productId: id } }),
    prisma.inventoryCount.count({ where: { productId: id } }),
  ]);
  if (orderItemCount > 0 || inventoryCountCount > 0) {
    throw new ProductHasHistoryError(
      "Produkt kann nicht endgültig gelöscht werden: es bestehen noch Bestellungen oder Inventur-Einträge dazu."
    );
  }
  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    // Belt-and-braces, same as the employee hard-delete route: the counts
    // above cover every FK into this row we know of, but a foreign key
    // violation here means something still references it that we missed.
    if (isForeignKeyViolation(err)) {
      throw new ProductHasHistoryError("Produkt kann nicht endgültig gelöscht werden: es bestehen noch verknüpfte Daten.");
    }
    throw err;
  }
}
