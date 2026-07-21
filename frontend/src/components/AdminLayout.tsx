import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";
import { Button } from "./ui/Button";

const STAFF_NAV_ITEMS = [
  { to: "/admin/employees", label: "Mitarbeiter" },
  { to: "/admin/orders", label: "Bestellungen" },
  { to: "/admin/inventory", label: "Inventur" },
];

// Onboarding and Budget-Grants call admin-only backend endpoints
// (adminOnly = requireRole("admin") in routes/admin.ts) — a supervisor
// following this link would land on a page whose data fetch 403s.
const ADMIN_ONLY_NAV_ITEMS = [
  { to: "/admin/onboarding", label: "Onboarding" },
  { to: "/admin/budget-grants", label: "Budget-Grants" },
];

export function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === "admin" ? [...STAFF_NAV_ITEMS, ...ADMIN_ONLY_NAV_ITEMS] : STAFF_NAV_ITEMS;

  return (
    <div className="min-h-screen">
      <AppHeader
        brand={
          <div className="flex items-center gap-2">
            <img src="/logo-compact.png" alt="müllex" className="h-8 w-auto" />
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-700">
              Admin
            </span>
          </div>
        }
        navItems={navItems}
        userLabel={
          <>
            {user?.email} <span className="text-slate-400">({user?.role})</span>
          </>
        }
        secondaryAction={
          user?.role === "admin" ? (
            <Button variant="outline" className="w-36" onClick={() => navigate("/admin/products")}>
              Waren Managen
            </Button>
          ) : undefined
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
