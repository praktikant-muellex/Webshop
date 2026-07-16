import { apiFetch } from "./client";
import { CurrentUser } from "./types";

export function loginAdmin(email: string, password: string) {
  return apiFetch<{ id: string; email: string; role: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginEmployee(firstName: string, lastName: string, employeeNumber: string) {
  return apiFetch<{ id: string; firstName: string; lastName: string; role: string }>("/auth/employee-login", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, employeeNumber }),
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiFetch<CurrentUser>("/auth/me");
}
