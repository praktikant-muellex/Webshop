import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";
import { employeeLabel } from "../lib/employeeLabel";

const NAV_ITEMS = [
  { to: "/catalog", label: "Katalog" },
  { to: "/grundausstattung", label: "Grundausstattung" },
  { to: "/cart", label: "Warenkorb" },
  { to: "/orders", label: "Meine Bestellungen" },
  { to: "/budget", label: "Mein Guthaben" },
];

export function EmployeeLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <AppHeader
        brand={<img src="/logo-compact.png" alt="müllex" className="h-8 w-auto" />}
        navItems={NAV_ITEMS}
        userLabel={user ? employeeLabel(user) : ""}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
