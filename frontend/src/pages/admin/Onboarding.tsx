import { FormEvent, useState } from "react";
import { onboardEmployee } from "../../api/admin";
import { ApiError } from "../../api/client";

const GROUPS = [
  { code: "fahrer", label: "Fahrer" },
  { code: "beifahrer", label: "Beifahrer" },
  { code: "laderfahrer_anlagenbediener", label: "Laderfahrer & Anlagenbediener" },
  { code: "instandhaltung_hofpersonal", label: "Instandhaltung & Hofpersonal" },
];

export function Onboarding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeGroupCode, setEmployeeGroupCode] = useState(GROUPS[0].code);
  const [hireDate, setHireDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await onboardEmployee({ email, password, employeeGroupCode, hireDate });
      setMessage(`Mitarbeiter ${email} wurde angelegt.`);
      setEmail("");
      setPassword("");
      setHireDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
    }
  };

  return (
    <div style={{ maxWidth: "400px" }}>
      <h1>Neuen Mitarbeiter anlegen</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Initiales Passwort
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Mitarbeitergruppe
            <select value={employeeGroupCode} onChange={(e) => setEmployeeGroupCode(e.target.value)}>
              {GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            Eintrittsdatum
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required />
          </label>
        </div>
        {message && <p style={{ color: "#2e7d32" }}>{message}</p>}
        {error && <p style={{ color: "#c62828" }}>{error}</p>}
        <button type="submit">Anlegen</button>
      </form>
    </div>
  );
}
