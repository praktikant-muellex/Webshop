import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";

export interface NavItem {
  to: string;
  label: string;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `min-w-[90px] rounded-md border-2 border-secondary-500 bg-white px-2.5 py-1 text-center text-sm font-semibold text-primary-700 transition-colors ${
    isActive ? "bg-secondary-50" : "hover:bg-secondary-50"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md border-2 border-secondary-500 bg-white px-2.5 py-1 text-center text-base font-semibold text-primary-700 transition-colors ${
    isActive ? "bg-secondary-50" : "hover:bg-secondary-50"
  }`;

/**
 * Shared by EmployeeLayout/AdminLayout. The desktop nav row hides below the
 * `md` breakpoint (it never fit next to the logo + user email + logout
 * button on a phone-width screen — it just overflowed the header
 * horizontally) in favor of a hamburger button that opens a stacked panel.
 */
export function AppHeader({
  brand,
  navItems,
  userLabel,
  secondaryAction,
}: {
  brand: ReactNode;
  navItems: NavItem[];
  userLabel: ReactNode;
  secondaryAction?: ReactNode;
}) {
  const { logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-20 bg-white">
      {/* Abmelden + username anchor at the right edge as their own group;
          the nav links and secondaryAction fill the middle and spread out
          across whatever space is left between the brand and that group. */}
      <div className="flex items-center justify-between gap-x-3 px-4 py-3 sm:px-6 lg:px-8">
        {brand}

        <div className="hidden flex-1 items-center justify-evenly gap-x-3 px-6 md:flex">
          <nav className="contents">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          {secondaryAction}
        </div>

        <div className="hidden items-center gap-x-3 md:flex">
          <Button variant="outline" className="w-36" onClick={() => logout()}>
            Abmelden
          </Button>
          <span className="text-sm text-slate-500">{userLabel}</span>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={mobileNavLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              {secondaryAction}
              <Button variant="outline" onClick={() => logout()}>
                Abmelden
              </Button>
            </div>
            <span className="text-sm text-slate-500">{userLabel}</span>
          </div>
        </div>
      )}

      <div className="h-0.5 bg-secondary-500" />
    </header>
  );
}
