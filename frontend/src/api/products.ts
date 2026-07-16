import { apiFetch } from "./client";
import { Product } from "./types";

export function fetchProducts(opts: { mandatoryForMe?: boolean; category?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.mandatoryForMe) params.set("mandatoryForMe", "true");
  if (opts.category) params.set("category", opts.category);
  const qs = params.toString();
  return apiFetch<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export function fetchProduct(id: string) {
  return apiFetch<Product>(`/products/${id}`);
}
