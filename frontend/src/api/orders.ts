import { apiFetch } from "./client";
import { Order } from "./types";

export interface OrderItemInput {
  productId: string;
  sizeLabel?: string;
  quantity?: number;
}

export function submitOrder(items: OrderItemInput[]) {
  return apiFetch<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function fetchMyOrders() {
  return apiFetch<Order[]>("/orders/me");
}

export function fetchOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`);
}
