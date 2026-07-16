import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export function EmployeeLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-primary-700">Arbeitskleidung Webshop</span>
            <nav className="flex gap-1">
              <NavLink to="/catalog" className={navLinkClass}>
                Katalog
              </NavLink>
              <NavLink to="/cart" className={navLinkClass}>
                Warenkorb
              </NavLink>
              <NavLink to="/orders" className={navLinkClass}>
                Meine Bestellungen
              </NavLink>
              <NavLink to="/budget" className={navLinkClass}>
                Mein Guthaben
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.email}</span>
            <Button variant="outline" onClick={() => logout()}>
              Abmelden
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
