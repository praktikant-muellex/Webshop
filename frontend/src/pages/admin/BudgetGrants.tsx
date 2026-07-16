import { useEffect, useState } from "react";
import { fetchGrantStatus, runAnnualGrant, GrantStatusEntry } from "../../api/admin";
import { ApiError } from "../../api/client";

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
      <h1>Jährliches Folgebudget</h1>
      <p>
        Läuft normalerweise automatisch als täglicher Job. Hier manuell auslösen (z.B. nach einer
        Korrektur des Eintrittsdatums) oder verifizieren, wer den aktuellen Zyklus schon erhalten hat.
      </p>
      <button onClick={handleRun}>Jetzt ausführen</button>
      {message && <p style={{ color: "#2e7d32" }}>{message}</p>}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Mitarbeiter</th>
            <th style={{ textAlign: "left" }}>Zyklus (1. Juli)</th>
            <th style={{ textAlign: "left" }}>Erhalten?</th>
          </tr>
        </thead>
        <tbody>
          {status.map((s) => (
            <tr key={s.userId} style={{ borderTop: "1px solid #eee" }}>
              <td>{s.email}</td>
              <td>{new Date(s.cycleJuly1).toLocaleDateString("de-AT")}</td>
              <td>{s.granted ? "Ja" : "Nein"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
