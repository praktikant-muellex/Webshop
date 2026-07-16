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
  if (entries.length === 0) return <p>Noch keine Guthaben-Bewegungen.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left" }}>Datum</th>
          <th style={{ textAlign: "left" }}>Art</th>
          <th style={{ textAlign: "right" }}>Betrag</th>
          <th style={{ textAlign: "left" }}>Notiz</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} style={{ borderTop: "1px solid #eee" }}>
            <td>{new Date(e.effectiveDate).toLocaleDateString("de-AT")}</td>
            <td>{ENTRY_TYPE_LABELS[e.entryType] ?? e.entryType}</td>
            <td style={{ textAlign: "right", color: e.amountEur < 0 ? "#c62828" : "#2e7d32" }}>
              {e.amountEur > 0 ? "+" : ""}
              {e.amountEur} €
            </td>
            <td>{e.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
