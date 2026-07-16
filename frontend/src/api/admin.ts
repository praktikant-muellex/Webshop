import { apiFetch } from "./client";
import { BudgetSummary, EmployeeListItem, Order } from "./types";

export function fetchEmployees() {
  return apiFetch<EmployeeListItem[]>("/admin/employees");
}

export function fetchEmployeeLedger(id: string) {
  return apiFetch<BudgetSummary>(`/admin/employees/${id}/ledger`);
}

export function createAdjustment(id: string, amountEur: number, note: string) {
  return apiFetch(`/admin/employees/${id}/adjustments`, {
    method: "POST",
    body: JSON.stringify({ amountEur, note }),
  });
}

export interface OnboardEmployeeInput {
  firstName: string;
  lastName: string;
  nickname?: string;
  employeeNumber: string;
  employeeGroupCode: string;
  hireDate: string;
}

export function onboardEmployee(input: OnboardEmployeeInput) {
  return apiFetch("/admin/employees", { method: "POST", body: JSON.stringify(input) });
}

export function updateEmployee(
  id: string,
  input: { employeeGroupCode?: string; employmentStatus?: string; resignationDate?: string }
) {
  return apiFetch(`/admin/employees/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export interface AdminOrderFilters {
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function fetchAllOrders(filters: AdminOrderFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return apiFetch<Order[]>(`/admin/orders${qs ? `?${qs}` : ""}`);
}

export function approveOrder(id: string) {
  return apiFetch<Order>(`/admin/orders/${id}/approve`, { method: "POST" });
}

export function rejectOrder(id: string, reason: string) {
  return apiFetch<Order>(`/admin/orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function updateOrderStatus(id: string, status: "ready_for_pickup" | "issued") {
  return apiFetch<Order>(`/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function runAnnualGrant() {
  return apiFetch<{ grantedCount: number }>("/admin/budget/run-annual-grant", { method: "POST" });
}

export interface GrantStatusEntry {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  granted: boolean;
  cycleJuly1: string;
}

export function fetchGrantStatus() {
  return apiFetch<GrantStatusEntry[]>("/admin/budget/grant-status");
}
