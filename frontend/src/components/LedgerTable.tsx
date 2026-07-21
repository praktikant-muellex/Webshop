import { BudgetLedgerEntry } from "../api/types";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  base_grant: "Grundausstattungsbudget",
  annual_grant: "Jährliches Folgebudget",
  annual_grant_prorated: "Anteiliges Folgebudget",
  order_deduction: "Bestellung",
  order_refund: "Rückerstattung",
  manual_adjustment: "Manuelle Anpassung",
};

export function LedgerTable({ entries }: { entries: BudgetLedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">Noch keine Guthaben-Bewegungen.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-secondary-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-bold text-white">Datum</th>
            <th className="px-4 py-2.5 text-left font-bold text-white">Art</th>
            <th className="px-4 py-2.5 text-right font-bold text-white">Betrag</th>
            <th className="px-4 py-2.5 text-left font-bold text-white">Notiz</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                {new Date(e.effectiveDate).toLocaleDateString("de-AT")}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                {ENTRY_TYPE_LABELS[e.entryType] ?? e.entryType}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${
                  e.amountEur < 0 ? "text-red-600" : "text-secondary-700"
                }`}
              >
                {e.amountEur > 0 ? "+" : ""}
                {e.amountEur} €
              </td>
              <td className="px-4 py-2.5 text-slate-500">{e.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
