import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";

const NAV_ITEMS = [
  { to: "/admin/employees", label: "Mitarbeiter" },
  { to: "/admin/orders", label: "Bestellungen" },
  { to: "/admin/onboarding", label: "Onboarding" },
  { to: "/admin/budget-grants", label: "Budget-Grants" },
];

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        brand={
          <div className="flex items-center gap-2">
            <img src="/logo-compact.png" alt="müllex" className="h-8 w-auto" />
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-semibold text-primary-700">
              Admin
            </span>
          </div>
        }
        navItems={NAV_ITEMS}
        userLabel={
          <>
            {user?.email} <span className="text-slate-400">({user?.role})</span>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
