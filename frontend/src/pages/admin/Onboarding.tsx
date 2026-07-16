import { FormEvent, useState } from "react";
import { onboardEmployee } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { inputClass, selectClass, labelClass } from "../../components/ui/formStyles";

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
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Neuen Mitarbeiter anlegen</h1>

      <Card className="mt-4 max-w-md p-6">
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
            <label className={labelClass}>Initiales Passwort</label>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Mitarbeitergruppe</label>
            <select
              className={selectClass}
              value={employeeGroupCode}
              onChange={(e) => setEmployeeGroupCode(e.target.value)}
            >
              {GROUPS.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Eintrittsdatum</label>
            <input
              type="date"
              className={inputClass}
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              required
            />
          </div>
          {message && (
            <p className="rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Anlegen
          </Button>
        </form>
      </Card>
    </div>
  );
}
