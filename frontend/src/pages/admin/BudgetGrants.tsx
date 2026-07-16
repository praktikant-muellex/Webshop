import { useEffect, useState } from "react";
import { fetchGrantStatus, runAnnualGrant, GrantStatusEntry } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";

export function BudgetGrants() {
  const [status, setStatus] = useState<GrantStatusEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchGrantStatus().then(setStatus);
  };

  useEffect(load, []);

  const handleRun = async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await runAnnualGrant();
      setMessage(`${result.grantedCount} neue Ledger-Einträge angelegt.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ausführung fehlgeschlagen.");
    }
  };

  return (
    <div>
      <PageHeading>Jährliches Folgebudget</PageHeading>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Läuft normalerweise automatisch als täglicher Job. Hier manuell auslösen (z.B. nach einer
        Korrektur des Eintrittsdatums) oder verifizieren, wer den aktuellen Zyklus schon erhalten hat.
      </p>

      <Button className="mt-4" onClick={handleRun}>
        Jetzt ausführen
      </Button>

      {message && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Mitarbeiter</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Zyklus (1. Juli)</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Erhalten?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.map((s) => (
              <tr key={s.userId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">{s.email}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {new Date(s.cycleJuly1).toLocaleDateString("de-AT")}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.granted ? "bg-secondary-100 text-secondary-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {s.granted ? "Ja" : "Nein"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
