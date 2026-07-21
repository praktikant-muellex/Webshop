import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { fetchMe, loginAdmin as apiLoginAdmin, loginEmployee as apiLoginEmployee, logout as apiLogout } from "../api/auth";
import { CurrentUser } from "../api/types";
import { useCart } from "./CartContext";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginEmployee: (firstName: string, lastName: string, employeeNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      await apiLoginAdmin(email, password);
      await refresh();
    },
    [refresh]
  );

  const loginEmployee = useCallback(
    async (firstName: string, lastName: string, employeeNumber: string) => {
      await apiLoginEmployee(firstName, lastName, employeeNumber);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    // A shared/kiosk browser tab must not let the next person who logs in
    // see (and potentially submit, billed to them) the previous employee's
    // unsubmitted cart.
    cart.clear();
  }, [cart]);

  return (
    <AuthContext.Provider value={{ user, loading, loginAdmin, loginEmployee, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden.");
  return ctx;
}
