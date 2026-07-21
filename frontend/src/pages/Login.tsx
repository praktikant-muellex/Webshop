import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { inputClass, labelClass } from "../components/ui/formStyles";

type Mode = "employee" | "admin";

export function Login() {
  const { user, loginAdmin, loginEmployee } = useAuth();
  const [mode, setMode] = useState<Mode>("employee");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const target = user.role === "admin" || user.role === "supervisor" ? "/admin/employees" : "/catalog";
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "employee") {
        await loginEmployee(firstName, lastName, employeeNumber);
      } else {
        await loginAdmin(email, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (tab: Mode) =>
    `flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      mode === tab ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <img src="/logo-full.png" alt="müllex – abfall sammeln & recyceln" className="mb-6 h-14 w-auto" />
        <h1 className="mb-1 text-xl font-semibold text-primary-500">Arbeitskleidung Webshop</h1>
        <p className="mb-6 text-sm text-slate-500">Melde dich an, um fortzufahren.</p>

        <div className="mb-6 flex rounded-md bg-slate-100 p-1">
          <button type="button" className={tabClass("employee")} onClick={() => setMode("employee")}>
            Mitarbeiter
          </button>
          <button type="button" className={tabClass("admin")} onClick={() => setMode("admin")}>
            Admin
          </button>
        </div>

        {mode === "employee" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Vorname</label>
              <input
                type="text"
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input
                type="text"
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Personalnummer</label>
              <input
                type="text"
                className={inputClass}
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Bitte warten..." : "Anmelden"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>E-Mail</label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Passwort</label>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Bitte warten..." : "Anmelden"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
