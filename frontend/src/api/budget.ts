import { apiFetch } from "./client";
import { BudgetSummary } from "./types";

export function fetchMyBudget() {
  return apiFetch<BudgetSummary>("/budget/me");
}
