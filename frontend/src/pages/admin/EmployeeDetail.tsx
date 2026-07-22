import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchEmployeeLedger, fetchEmployee, createAdjustment, updateEmployee } from "../../api/admin";
import { BudgetSummary, EmployeeListItem } from "../../api/types";
import { LedgerTable } from "../../components/LedgerTable";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BackButton } from "../../components/ui/BackButton";
import { inputClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  // Manuelle Anpassung / Austritt erfassen call adminOnly backend endpoints
  // (backend/src/routes/admin.ts) — a supervisor would fill out either form
  // and only find out it's rejected after submitting.
  const isAdmin = user?.role === "admin";
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [employee, setEmployee] = useState<EmployeeListItem | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [resignationDate, setResignationDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (id) {
      Promise.all([fetchEmployeeLedger(id), fetchEmployee(id)])
        .then(([ledger, emp]) => {
          if (!cancelled) {
            setSummary(ledger);
            setEmployee(emp);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Mitarbeiterdaten konnten nicht geladen werden.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  const load = () => {
    if (!id) return;
    fetchEmployeeLedger(id).then(setSummary);
    fetchEmployee(id).then(setEmployee);
  };

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
      fetchEmployee(id).then(setEmployee);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen.");
    }
  };

  if (!summary || !employee) {
    return (
      <div>
        <BackButton />
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Lade...</p>}
      </div>
    );
  }

  const alreadyResigned = employee.employmentStatus === "resigned";

  return (
    <div>
      <BackButton />
      <PageHeading>Mitarbeiter-Details</PageHeading>

      <Card className="mt-4 inline-block px-6 py-4">
        <p className="text-sm text-slate-500">Aktuelles Guthaben</p>
        <p className="text-3xl font-semibold text-primary-700">{summary.balanceEur} €</p>
      </Card>

      {message && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Manuelle Anpassung</h2>
            <form onSubmit={submitAdjustment} className="space-y-3">
              <input
                type="number"
                step="1"
                className={inputClass}
                placeholder="Betrag (€, negativ zum Abziehen, ganze Zahl)"
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
            {alreadyResigned ? (
              <p className="text-sm text-slate-500">
                Mitarbeiter ist bereits gekündigt
                {employee.resignationDate && (
                  <> (Austrittsdatum {new Date(employee.resignationDate).toLocaleDateString("de-AT")})</>
                )}
                .
              </p>
            ) : (
              <form onSubmit={submitResignation} className="space-y-3">
                <input
                  type="date"
                  className={inputClass}
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  required
                />
                <Button type="submit" variant="danger">
                  Als gekündigt markieren
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Guthaben-Verlauf</h2>
      <LedgerTable entries={summary.ledger} />
    </div>
  );
}
