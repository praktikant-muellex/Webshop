import { apiFetch } from "./client";
import { Order, OrderStatus } from "./types";

// The backend's confirm-pickup response has no items[].product join (see
// api/admin.ts's OrderMutationResult for the same reasoning) — callers
// refetch the full order via fetchOrder() afterward rather than trusting
// this narrower shape.
interface OrderMutationResult {
  id: string;
  status: OrderStatus;
}

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

export function confirmPickup(id: string) {
  return apiFetch<OrderMutationResult>(`/orders/${id}/confirm-pickup`, { method: "POST" });
}
