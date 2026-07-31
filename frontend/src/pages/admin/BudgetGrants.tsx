import { useCallback, useState } from "react";
import { fetchGrantStatus, runAnnualGrant } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useLoadableList } from "../../hooks/useLoadableList";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { Spinner } from "../../components/ui/Spinner";
import { employeeLabel } from "../../lib/employeeLabel";

export function BudgetGrants() {
  const [message, setMessage] = useState<string | null>(null);

  const fetcher = useCallback(() => fetchGrantStatus(), []);
  const {
    data: status,
    loading,
    error,
    setError,
    reload: load,
  } = useLoadableList(fetcher, "Status konnte nicht geladen werden.");

  const [running, handleRun] = useAsyncAction(async () => {
    setError(null);
    setMessage(null);
    try {
      const result = await runAnnualGrant();
      setMessage(`${result.grantedCount} neue Ledger-Einträge angelegt.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ausführung fehlgeschlagen.");
    }
  });

  return (
    <div>
      <PageHeading>Jährliches Folgebudget</PageHeading>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Läuft normalerweise automatisch als täglicher Job. Hier manuell auslösen (z.B. nach einer
        Korrektur des Eintrittsdatums) oder verifizieren, wer den aktuellen Zyklus schon erhalten hat.
        Es werden nur Mitarbeiter gelistet, deren nächster 1.-Juli-Stichtag bereits erreicht ist — wer
        z.B. erst diesen Sommer eingestellt wurde, erscheint hier laut Regel erst zum 1. Juli des
        Folgejahres.
      </p>

      <Button className="mt-4" onClick={handleRun} disabled={running}>
        {running ? "Wird ausgeführt..." : "Jetzt ausführen"}
      </Button>

      {message && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">Mitarbeiter</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Zyklus (1. Juli)</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Erhalten?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={3}>
                  <Spinner label="Lade Budget-Status..." />
                </td>
              </tr>
            )}
            {!loading && status.length === 0 && !error && (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-slate-500">
                  Niemand ist aktuell für den laufenden Zyklus fällig.
                </td>
              </tr>
            )}
            {status.map((s) => (
              <tr key={s.userId} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">{employeeLabel(s)}</td>
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
