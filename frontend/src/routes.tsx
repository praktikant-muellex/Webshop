import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireRole } from "./context/RouteGuards";
import { useAuth } from "./context/AuthContext";
import { EmployeeLayout } from "./components/EmployeeLayout";
import { AdminLayout } from "./components/AdminLayout";
import { Login } from "./pages/Login";
import { Catalog } from "./pages/employee/Catalog";
import { Grundausstattung } from "./pages/employee/Grundausstattung";
import { Cart } from "./pages/employee/Cart";
import { Orders } from "./pages/employee/Orders";
import { OrderDetail } from "./pages/employee/OrderDetail";
import { Budget } from "./pages/employee/Budget";
import { Employees } from "./pages/admin/Employees";
import { EmployeeDetail } from "./pages/admin/EmployeeDetail";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminOrderDetail } from "./pages/admin/AdminOrderDetail";
import { Onboarding } from "./pages/admin/Onboarding";
import { BudgetGrants } from "./pages/admin/BudgetGrants";
import { Inventory } from "./pages/admin/Inventory";
import { ManageProducts } from "./pages/admin/ManageProducts";

function RoleBasedHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const target = user.role === "admin" || user.role === "supervisor" ? "/admin/employees" : "/catalog";
  return <Navigate to={target} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={["employee"]} />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/grundausstattung" element={<Grundausstattung />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/budget" element={<Budget />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={["admin", "supervisor"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
            <Route path="/admin/inventory" element={<Inventory />} />

            {/* Backend-enforced adminOnly (requireRole("admin")) — a supervisor
                navigating here directly would otherwise hit a 403 mid-page. */}
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/admin/onboarding" element={<Onboarding />} />
              <Route path="/admin/budget-grants" element={<BudgetGrants />} />
              <Route path="/admin/products" element={<ManageProducts />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<RoleBasedHome />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
