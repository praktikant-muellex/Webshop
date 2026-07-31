import { ComponentType, lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireRole } from "./context/RouteGuards";
import { useAuth } from "./context/AuthContext";
import { EmployeeLayout } from "./components/EmployeeLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { Login } from "./pages/Login";

/** Wraps a named (non-default) export as a lazy-loaded route component. */
function lazyPage<M extends Record<string, ComponentType>, K extends keyof M>(loader: () => Promise<M>, name: K) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const Catalog = lazyPage(() => import("./pages/employee/Catalog"), "Catalog");
const Grundausstattung = lazyPage(() => import("./pages/employee/Grundausstattung"), "Grundausstattung");
const Cart = lazyPage(() => import("./pages/employee/Cart"), "Cart");
const Orders = lazyPage(() => import("./pages/employee/Orders"), "Orders");
const OrderDetail = lazyPage(() => import("./pages/employee/OrderDetail"), "OrderDetail");
const Budget = lazyPage(() => import("./pages/employee/Budget"), "Budget");

const Employees = lazyPage(() => import("./pages/admin/Employees"), "Employees");
const EmployeeDetail = lazyPage(() => import("./pages/admin/EmployeeDetail"), "EmployeeDetail");
const AdminOrders = lazyPage(() => import("./pages/admin/AdminOrders"), "AdminOrders");
const AdminOrderDetail = lazyPage(() => import("./pages/admin/AdminOrderDetail"), "AdminOrderDetail");
const Onboarding = lazyPage(() => import("./pages/admin/Onboarding"), "Onboarding");
const BudgetGrants = lazyPage(() => import("./pages/admin/BudgetGrants"), "BudgetGrants");
const Inventory = lazyPage(() => import("./pages/admin/Inventory"), "Inventory");
const ManageProducts = lazyPage(() => import("./pages/admin/ManageProducts"), "ManageProducts");

function RoleBasedHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const target = user.role === "admin" || user.role === "supervisor" ? "/admin/employees" : "/catalog";
  return <Navigate to={target} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}
