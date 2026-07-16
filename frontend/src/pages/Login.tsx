import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function Login() {
  const { user, login } = useAuth();
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
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "320px", margin: "4rem auto" }}>
      <h1>Anmelden</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error && <p style={{ color: "#c62828" }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Bitte warten..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
