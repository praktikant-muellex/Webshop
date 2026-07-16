import { FormEvent, useState } from "react";
import { onboardEmployee } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { inputClass, selectClass, labelClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";

const GROUPS = [
  { code: "fahrer", label: "Fahrer" },
  { code: "beifahrer", label: "Beifahrer" },
  { code: "laderfahrer_anlagenbediener", label: "Laderfahrer & Anlagenbediener" },
  { code: "instandhaltung_hofpersonal", label: "Instandhaltung & Hofpersonal" },
];

export function Onboarding() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeGroupCode, setEmployeeGroupCode] = useState(GROUPS[0].code);
  const [hireDate, setHireDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await onboardEmployee({
        firstName,
        lastName,
        nickname: nickname || undefined,
        employeeNumber,
        employeeGroupCode,
        hireDate,
      });
      setMessage(`Mitarbeiter ${firstName} ${lastName} wurde angelegt.`);
      setFirstName("");
      setLastName("");
      setNickname("");
      setEmployeeNumber("");
      setHireDate("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
    }
  };

  return (
    <div>
      <PageHeading>Neuen Mitarbeiter anlegen</PageHeading>

      <Card className="mt-4 max-w-md p-6">
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
            <label className={labelClass}>Zweiter Vorname / Kürzel / Spitzname (optional)</label>
            <input
              type="text"
              className={inputClass}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Hilft, gleichnamige Mitarbeiter zu unterscheiden"
            />
          </div>
          <div>
            <label className={labelClass}>Angestelltennummer</label>
            <input
              type="text"
              className={inputClass}
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
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
