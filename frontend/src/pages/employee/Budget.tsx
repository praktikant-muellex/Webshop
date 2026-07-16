import { useEffect, useState } from "react";
import { fetchMyBudget } from "../../api/budget";
import { BudgetSummary } from "../../api/types";
import { LedgerTable } from "../../components/LedgerTable";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function Budget() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    fetchMyBudget().then(setSummary);
  }, []);

  if (!summary) return <p className="text-sm text-slate-500">Lade...</p>;

  return (
    <div>
      <PageHeading>Mein Guthaben</PageHeading>

      <Card className="mt-4 inline-block px-6 py-4">
        <p className="text-sm text-slate-500">Aktuelles Guthaben</p>
        <p className="text-3xl font-semibold text-primary-700">{summary.balanceEur} €</p>
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-slate-900">Verlauf</h2>
      <LedgerTable entries={summary.ledger} />
    </div>
  );
}
