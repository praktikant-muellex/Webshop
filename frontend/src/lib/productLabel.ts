import { Product } from "../api/types";

/** Disambiguates color variants that share the same catalog name (e.g. "Poloshirt" grau/weiß). */
export function productLabel(product: Pick<Product, "name" | "color">): string {
  return product.color ? `${product.name} (${product.color})` : product.name;
}
