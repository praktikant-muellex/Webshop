import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth, RequireRole } from "./context/RouteGuards";
import { useAuth } from "./context/AuthContext";
import { EmployeeLayout } from "./components/EmployeeLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { Login } from "./pages/Login";

const Catalog = lazy(() => import("./pages/employee/Catalog").then((m) => ({ default: m.Catalog })));
const Grundausstattung = lazy(() =>
  import("./pages/employee/Grundausstattung").then((m) => ({ default: m.Grundausstattung })),
);
const Cart = lazy(() => import("./pages/employee/Cart").then((m) => ({ default: m.Cart })));
const Orders = lazy(() => import("./pages/employee/Orders").then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() =>
  import("./pages/employee/OrderDetail").then((m) => ({ default: m.OrderDetail })),
);
const Budget = lazy(() => import("./pages/employee/Budget").then((m) => ({ default: m.Budget })));

const Employees = lazy(() => import("./pages/admin/Employees").then((m) => ({ default: m.Employees })));
const EmployeeDetail = lazy(() =>
  import("./pages/admin/EmployeeDetail").then((m) => ({ default: m.EmployeeDetail })),
);
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() =>
  import("./pages/admin/AdminOrderDetail").then((m) => ({ default: m.AdminOrderDetail })),
);
const Onboarding = lazy(() => import("./pages/admin/Onboarding").then((m) => ({ default: m.Onboarding })));
const BudgetGrants = lazy(() =>
  import("./pages/admin/BudgetGrants").then((m) => ({ default: m.BudgetGrants })),
);
const Inventory = lazy(() => import("./pages/admin/Inventory").then((m) => ({ default: m.Inventory })));
const ManageProducts = lazy(() =>
  import("./pages/admin/ManageProducts").then((m) => ({ default: m.ManageProducts })),
);

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
