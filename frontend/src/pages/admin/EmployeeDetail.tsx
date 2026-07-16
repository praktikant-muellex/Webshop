import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEmployeeLedger, createAdjustment, updateEmployee } from "../../api/admin";
import { BudgetSummary } from "../../api/types";
import { LedgerTable } from "../../components/LedgerTable";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { inputClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";

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

  if (!summary) return <p className="text-sm text-slate-500">Lade...</p>;

  return (
    <div>
      <PageHeading>Mitarbeiter-Details</PageHeading>

      <Card className="mt-4 inline-block px-6 py-4">
        <p className="text-sm text-slate-500">Aktuelles Guthaben</p>
        <p className="text-3xl font-semibold text-primary-700">{summary.balanceEur} €</p>
      </Card>

      {message && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Manuelle Anpassung</h2>
          <form onSubmit={submitAdjustment} className="space-y-3">
            <input
              type="number"
              className={inputClass}
              placeholder="Betrag (€, negativ zum Abziehen)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <input
              type="text"
              className={inputClass}
              placeholder="Begründung"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
            />
            <Button type="submit">Speichern</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-900">Austritt erfassen</h2>
          <form onSubmit={submitResignation} className="space-y-3">
            <input
              type="date"
              className={inputClass}
              value={resignationDate}
              onChange={(e) => setResignationDate(e.target.value)}
              required
            />
            <Button type="submit" variant="danger">
              Als ausgeschieden markieren
            </Button>
          </form>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Guthaben-Verlauf</h2>
      <LedgerTable entries={summary.ledger} />
    </div>
  );
}
