import { useEffect, useState } from "react";
import { fetchInventoryOverview, fetchInventorySessions, openInventorySessionPdf, submitInventory } from "../../api/admin";
import { InventoryOverview, InventorySessionListItem } from "../../api/types";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { inputClass, labelClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";

const CATEGORY_LABELS: Record<string, string> = {
  SHIRTS: "Shirts",
  HOSEN: "Hosen",
  PULLOVER: "Pullover",
  JACKEN_WESTEN: "Jacken & Westen",
  ZUBEHOER: "Zubehör",
};

function productLabel(row: { productName: string; color: string | null }): string {
  return row.color ? `${row.productName} (${row.color})` : row.productName;
}

// Admin/supervisor accounts usually have no name on file, only email.
function staffLabel(person: { firstName: string | null; lastName: string | null; email: string | null }): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.email || "Unbekannt";
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
  return `${date.toLocaleDateString("de-AT")}, ${time} Uhr`;
}

/** Red text + warning triangle whenever fewer units were physically counted than expected. */
function DifferenceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">–</span>;
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-red-600">
        <span aria-hidden="true">⚠</span>
        {value}
      </span>
    );
  }
  return <span className="text-slate-700">{value > 0 ? `+${value}` : value}</span>;
}

export function Inventory() {
  const { user } = useAuth();
  // Submitting a new stocktake calls POST /admin/inventory, which is
  // adminOnly (backend/src/routes/admin.ts) — a supervisor could otherwise
  // fill in a full count for every product and only find out at the end
  // that saving is rejected.
  const isAdmin = user?.role === "admin";
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<InventorySessionListItem[] | null>(null);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);

  const toggleHistory = () => {
    setShowHistory((open) => !open);
    if (!sessions) fetchInventorySessions().then(setSessions);
  };

  const handleOpenPdf = async (id: string) => {
    setError(null);
    setOpeningPdfId(id);
    try {
      await openInventorySessionPdf(id);
    } catch {
      setError("PDF konnte nicht geladen werden.");
    } finally {
      setOpeningPdfId(null);
    }
  };

  const load = () => {
    fetchInventoryOverview().then((data) => {
      setOverview(data);
      setInputs({});
    });
  };

  useEffect(load, []);

  if (!overview) {
    return (
      <div>
        <PageHeading>Inventur</PageHeading>
        <Card className="mt-4">
          <Spinner label="Lade Inventur..." />
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    const counts: Array<{ productId: string; quantity: number }> = [];
    for (const row of overview.rows) {
      const raw = inputs[row.productId];
      if (raw === undefined || raw.trim() === "") {
        setError(`Bitte für "${productLabel(row)}" eine Menge eintragen.`);
        return;
      }
      const quantity = Number(raw);
      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
        setError(`Ungültige Menge für "${productLabel(row)}".`);
        return;
      }
      counts.push({ productId: row.productId, quantity });
    }

    setSubmitting(true);
    try {
      await submitInventory(counts, takenAt);
      setMessage("Neue Inventur wurde gespeichert.");
      load();
      if (sessions) fetchInventorySessions().then(setSessions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeading>Inventur</PageHeading>

      {overview.latestSession ? (
        <p className="mb-4 text-sm text-slate-500">
          Letzte erfasste Inventur: {formatDateTime(overview.latestSession.createdAt)}
          {overview.latestSession.createdBy && <> von {staffLabel(overview.latestSession.createdBy)}</>}
        </p>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          Noch keine Inventur erfasst. Die erste Eingabe legt den Ausgangsbestand fest.
        </p>
      )}

      <Button variant="neutral" className="mb-4" onClick={toggleHistory}>
        {showHistory ? "Frühere Inventuren ausblenden" : "Frühere Inventuren anzeigen"}
      </Button>

      {showHistory && (
        <Card className="mb-6 overflow-x-auto">
          {sessions === null ? (
            <Spinner label="Lade frühere Inventuren..." />
          ) : sessions.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Noch keine Inventuren erfasst.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-secondary-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Erstellt am</th>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Erfasst von</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                      {formatDateTime(session.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{staffLabel(session.createdBy)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenPdf(session.id)}
                        disabled={openingPdfId === session.id}
                        className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      >
                        {openingPdfId === session.id ? "Öffnet..." : "PDF ansehen"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">Produkt</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Letzte Inventur</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Letzte Differenz</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Verkauft seither</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Soll-Bestand</th>
              {isAdmin && (
                <>
                  <th className="px-4 py-2.5 text-right font-bold text-white">Neue Zählung</th>
                  <th className="px-4 py-2.5 text-right font-bold text-white">Differenz</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {overview.rows.map((row) => {
              const raw = inputs[row.productId] ?? "";
              const typed = raw.trim() === "" ? null : Number(raw);
              const livePreview =
                row.expectedStock !== null && typed !== null && Number.isFinite(typed)
                  ? Math.round(typed) - row.expectedStock
                  : null;

              return (
                <tr key={row.productId} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">
                    {productLabel(row)}
                    <span className="ml-2 text-xs text-slate-400">{CATEGORY_LABELS[row.category]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{row.previousCount ?? "–"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <DifferenceCell value={row.lastDifference} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{row.soldSincePrevious ?? "–"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{row.expectedStock ?? "–"}</td>
                  {isAdmin && (
                    <>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className={`${inputClass} w-24 text-right`}
                          value={raw}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Block negative entries outright — a stocktake count can't be below zero.
                            if (value !== "" && Number(value) < 0) return;
                            setInputs((prev) => ({ ...prev, [row.productId]: value }));
                          }}
                          onKeyDown={(e) => {
                            // Both block the number input's native step behavior — typing
                            // fast down a long list, a reflexive ArrowDown (muscle memory
                            // from spreadsheet-style row navigation) or scrolling the page
                            // with the mouse still over a focused field silently changes
                            // the value by `step` (1) instead of moving focus/scrolling.
                            if (e.key === "-" || e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DifferenceCell value={livePreview} />
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className={labelClass}>Datum der Inventur</label>
            <input
              type="date"
              className={inputClass}
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Speichert..." : "Neue Inventur speichern"}
          </Button>
        </div>
      )}

      {message && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
