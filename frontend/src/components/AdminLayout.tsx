import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid #ccc" }}>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <NavLink to="/admin/employees">Mitarbeiter</NavLink>
          <NavLink to="/admin/orders">Bestellungen</NavLink>
          <NavLink to="/admin/onboarding">Onboarding</NavLink>
          <NavLink to="/admin/budget-grants">Budget-Grants</NavLink>
        </nav>
        <div>
          <span>{user?.email} ({user?.role})</span>{" "}
          <button onClick={() => logout()}>Abmelden</button>
        </div>
      </header>
      <main style={{ padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
