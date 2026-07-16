import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Role } from "../api/types";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <p>Lade...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Lade...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
