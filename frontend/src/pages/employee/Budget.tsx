import { useEffect, useState } from "react";
import { fetchMyBudget } from "../../api/budget";
import { BudgetSummary } from "../../api/types";
import { LedgerTable } from "../../components/LedgerTable";

export function Budget() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    fetchMyBudget().then(setSummary);
  }, []);

  if (!summary) return <p>Lade...</p>;

  return (
    <div>
      <h1>Mein Guthaben</h1>
      <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{summary.balanceEur} €</p>
      <h2>Verlauf</h2>
      <LedgerTable entries={summary.ledger} />
    </div>
  );
}
