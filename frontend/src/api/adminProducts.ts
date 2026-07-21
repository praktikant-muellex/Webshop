import { apiFetch } from "./client";
import { Product } from "./types";

export function fetchAllProductsAdmin(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<Product[]>(`/admin/products${qs}`);
}

export interface CreateProductVariantInput {
  color: string | null;
  imageDataUrl: string;
}

export interface CreateProductInput {
  name: string;
  category: string;
  priceEur: number;
  sizes: string[];
  variants: CreateProductVariantInput[];
}

export function createProduct(input: CreateProductInput) {
  return apiFetch<Product[]>("/admin/products", { method: "POST", body: JSON.stringify(input) });
}

export function setProductActive(id: string, active: boolean) {
  return apiFetch<Product>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });
}

export function deleteProductPermanently(id: string) {
  return apiFetch<void>(`/admin/products/${id}`, { method: "DELETE" });
}
