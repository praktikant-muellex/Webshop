import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function EmployeeLayout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid #ccc" }}>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <NavLink to="/catalog">Katalog</NavLink>
          <NavLink to="/cart">Warenkorb</NavLink>
          <NavLink to="/orders">Meine Bestellungen</NavLink>
          <NavLink to="/budget">Mein Guthaben</NavLink>
        </nav>
        <div>
          <span>{user?.email}</span>{" "}
          <button onClick={() => logout()}>Abmelden</button>
        </div>
      </header>
      <main style={{ padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
