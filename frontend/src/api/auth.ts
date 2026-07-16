import { apiFetch } from "./client";
import { CurrentUser } from "./types";

export function login(email: string, password: string) {
  return apiFetch<{ id: string; email: string; role: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiFetch<CurrentUser>("/auth/me");
}
