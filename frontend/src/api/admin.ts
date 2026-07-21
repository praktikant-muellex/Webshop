import { apiFetch, ApiError, API_URL } from "./client";
import { BudgetSummary, EmployeeListItem, InventoryOverview, InventorySessionListItem, Order, OrderStatus } from "./types";

// approveOrder/rejectOrder/updateOrderStatus intentionally return this
// narrower shape, not the full `Order` type: the backend's approveOrder
// response has no items[].product join, and reject/status-update return no
// items at all. Every caller today discards the response and calls a
// separate `load()` to refetch the fully-populated order anyway — claiming
// `Order` here was a lie the type system couldn't catch.
interface OrderMutationResult {
  id: string;
  status: OrderStatus;
}

export function fetchEmployees(includeHidden = false) {
  return apiFetch<EmployeeListItem[]>(`/admin/employees${includeHidden ? "?includeHidden=true" : ""}`);
}

export function fetchEmployee(id: string) {
  return apiFetch<EmployeeListItem>(`/admin/employees/${id}`);
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

export function onboardAdmin(input: { email: string; password: string }) {
  return apiFetch("/admin/admins", { method: "POST", body: JSON.stringify(input) });
}

export function updateEmployee(
  id: string,
  input: { employeeGroupCode?: string; employmentStatus?: string; resignationDate?: string; hidden?: boolean }
) {
  return apiFetch(`/admin/employees/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function setEmployeeHidden(id: string, hidden: boolean) {
  return updateEmployee(id, { hidden });
}

export function deleteEmployeePermanently(id: string) {
  return apiFetch<void>(`/admin/employees/${id}`, { method: "DELETE" });
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
  return apiFetch<OrderMutationResult>(`/admin/orders/${id}/approve`, { method: "POST" });
}

export function rejectOrder(id: string, reason: string) {
  return apiFetch<OrderMutationResult>(`/admin/orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function updateOrderStatus(id: string, status: "ready_for_pickup" | "issued") {
  return apiFetch<OrderMutationResult>(`/admin/orders/${id}/status`, {
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

export function fetchInventoryOverview() {
  return apiFetch<InventoryOverview>("/admin/inventory");
}

export function submitInventory(counts: Array<{ productId: string; quantity: number }>, takenAt?: string) {
  return apiFetch("/admin/inventory", { method: "POST", body: JSON.stringify({ counts, takenAt }) });
}

export function fetchInventorySessions() {
  return apiFetch<InventorySessionListItem[]>("/admin/inventory/sessions");
}

/**
 * Some browsers/extensions force a "Save As" dialog for a plain
 * `<a href target="_blank">` to a PDF endpoint regardless of the server's
 * `Content-Disposition: inline` header. Fetching the bytes ourselves and
 * opening them as a blob: URL always renders in the browser's native PDF
 * viewer instead, since that decision is no longer driven by response
 * headers at all.
 *
 * The blank window is opened synchronously, before the `await`, so browsers
 * still recognize it as tied to the click and don't block it as a popup —
 * only its location is set once the PDF has actually loaded.
 */
export async function openInventorySessionPdf(id: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const res = await fetch(`${API_URL}/admin/inventory/sessions/${id}/pdf`, { credentials: "include" });
    if (!res.ok) throw new ApiError(res.status, "PDF konnte nicht geladen werden.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) {
      win.location.href = url;
    } else {
      // Popup blocked — fall back to a direct download instead of nothing.
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventur-${id}.pdf`;
      link.click();
    }
  } catch (err) {
    win?.close();
    throw err;
  }
}
