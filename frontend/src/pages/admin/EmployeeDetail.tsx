import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEmployeeLedger, createAdjustment, updateEmployee } from "../../api/admin";
import { BudgetSummary } from "../../api/types";
import { LedgerTable } from "../../components/LedgerTable";
import { ApiError } from "../../api/client";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (id) fetchEmployeeLedger(id).then(setSummary);
  };

  useEffect(load, [id]);

  const submitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      await createAdjustment(id, Number(amount), note);
      setAmount("");
      setNote("");
      setMessage("Anpassung gespeichert.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anpassung fehlgeschlagen.");
    }
  };

  const submitResignation = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !resignationDate) return;
    setError(null);
    setMessage(null);
    try {
      await updateEmployee(id, { employmentStatus: "resigned", resignationDate });
      setMessage("Austritt erfasst, betroffene Bestellungen der letzten 3 Monate wurden markiert.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen.");
    }
  };

  if (!summary) return <p>Lade...</p>;

  return (
    <div>
      <h1>Mitarbeiter-Details</h1>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{summary.balanceEur} € Guthaben</p>

      {message && <p style={{ color: "#2e7d32" }}>{message}</p>}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}

      <h2>Manuelle Anpassung</h2>
      <form onSubmit={submitAdjustment} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="number"
          placeholder="Betrag (€, negativ zum Abziehen)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Begründung"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <button type="submit">Speichern</button>
      </form>

      <h2>Austritt erfassen</h2>
      <form onSubmit={submitResignation} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input type="date" value={resignationDate} onChange={(e) => setResignationDate(e.target.value)} required />
        <button type="submit">Als ausgeschieden markieren</button>
      </form>

      <h2>Guthaben-Verlauf</h2>
      <LedgerTable entries={summary.ledger} />
    </div>
  );
}
