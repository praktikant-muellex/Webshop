import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAllOrders, updateOrderStatus, updateOrderItems } from "../../api/admin";
import { fetchAllProductsAdmin } from "../../api/adminProducts";
import { Order, Product } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { RejectionReasonBanner } from "../../components/RejectionReasonBanner";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BackButton } from "../../components/ui/BackButton";
import { PageHeading } from "../../components/ui/PageHeading";
import { selectClass } from "../../components/ui/formStyles";
import { productLabel } from "../../lib/productLabel";
import { employeeLabel } from "../../lib/employeeLabel";

interface DraftLine {
  productId: string;
  sizeLabel: string | null;
  quantity: number;
}

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllOrders()
      .then((all) => {
        if (cancelled) return;
        const match = all.find((o) => o.id === id) ?? null;
        setOrder(match);
        if (!match) setError("Bestellung nicht gefunden.");
      })
      .catch(() => {
        if (!cancelled) setError("Bestellung konnte nicht geladen werden.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const load = () => {
    fetchAllOrders().then((all) => setOrder(all.find((o) => o.id === id) ?? null));
  };

  const advanceStatus = async (status: "ready_for_pickup" | "issued") => {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      await updateOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Statusänderung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const startEditing = () => {
    if (!order) return;
    setSaveError(null);
    setDraft(order.items.map((i) => ({ productId: i.productId, sizeLabel: i.sizeLabel, quantity: i.quantity })));
    setEditing(true);
    fetchAllProductsAdmin()
      .then((all) => setProducts(all.filter((p) => p.active)))
      .catch(() => setSaveError("Produktliste konnte nicht geladen werden."));
  };

  const cancelEditing = () => {
    setEditing(false);
    setSaveError(null);
  };

  const updateDraftLine = (index: number, patch: Partial<DraftLine>) => {
    setDraft((lines) => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeDraftLine = (index: number) => {
    setDraft((lines) => lines.filter((_, i) => i !== index));
  };

  const addDraftLine = () => {
    const first = products[0];
    if (!first) return;
    setDraft((lines) => [
      ...lines,
      { productId: first.id, sizeLabel: first.sizes[0]?.sizeLabel ?? null, quantity: 1 },
    ]);
  };

  const saveDraft = async () => {
    if (!id) return;
    if (draft.length === 0) {
      setSaveError("Eine Bestellung braucht mindestens eine Position.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await updateOrderItems(
        id,
        draft.map((line) => ({
          productId: line.productId,
          sizeLabel: line.sizeLabel ?? undefined,
          quantity: line.quantity,
        }))
      );
      load();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  // Only the *initial* load failure should hijack the page like this — once
  // `order` has loaded successfully at least once, a later error (e.g. a
  // failed status change) must NOT hide the already-loaded order behind
  // this branch; that's surfaced inline instead (see the `{error && ...}`
  // below, right before the item table).
  if (!order) {
    return (
      <div>
        <BackButton />
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Lade...</p>}
      </div>
    );
  }

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <BackButton />
      <PageHeading>Bestellung von {order.user ? employeeLabel(order.user) : "-"}</PageHeading>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.reclaimFlag && (
        <p className="mt-2 text-sm text-amber-700">
          ⚠ Rückforderungspflichtig (Austritt innerhalb 3 Monaten).
        </p>
      )}
      {order.rejectionReason && <RejectionReasonBanner reason={order.rejectionReason} />}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {editing ? (
        <>
          <Card className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-secondary-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Produkt</th>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Größe</th>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Menge</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draft.map((line, index) => {
                  const selected = products.find((p) => p.id === line.productId);
                  return (
                    <tr key={index}>
                      <td className="px-4 py-2.5">
                        <select
                          className={`${selectClass} w-auto`}
                          value={line.productId}
                          onChange={(e) => {
                            const product = products.find((p) => p.id === e.target.value);
                            updateDraftLine(index, {
                              productId: e.target.value,
                              sizeLabel: product?.sizes[0]?.sizeLabel ?? null,
                            });
                          }}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {productLabel(p)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        {selected && selected.sizes.length > 0 ? (
                          <select
                            className={`${selectClass} w-auto`}
                            value={line.sizeLabel ?? ""}
                            onChange={(e) => updateDraftLine(index, { sizeLabel: e.target.value })}
                          >
                            {selected.sizes.map((s) => (
                              <option key={s.id} value={s.sizeLabel}>
                                {s.sizeLabel}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className={`${selectClass} w-20`}
                          value={line.quantity}
                          onChange={(e) => updateDraftLine(index, { quantity: Number(e.target.value) || 1 })}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          className="text-sm text-red-600 hover:text-red-700"
                          onClick={() => removeDraftLine(index)}
                        >
                          Entfernen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Button variant="secondary" className="mt-3" onClick={addDraftLine} disabled={products.length === 0}>
            + Position hinzufügen
          </Button>

          {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

          <div className="mt-4 flex gap-3">
            <Button onClick={saveDraft} disabled={saving}>
              {saving ? "Wird gespeichert..." : "Speichern"}
            </Button>
            <Button variant="secondary" onClick={cancelEditing} disabled={saving}>
              Abbrechen
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-secondary-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Produkt</th>
                  <th className="px-4 py-2.5 text-left font-bold text-white">Größe</th>
                  <th className="px-4 py-2.5 text-right font-bold text-white">Preis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2.5 text-slate-700">
                      <div className="flex items-center gap-3">
                        {i.product.imageUrl && (
                          <img
                            src={i.product.imageUrl}
                            alt={i.product.name}
                            loading="lazy"
                            className="h-10 w-10 rounded object-contain"
                          />
                        )}
                        <span>{productLabel(i.product)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{i.sizeLabel ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{i.unitPriceEur} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <p className="mt-4 text-lg font-semibold text-slate-900">Gesamt: {total} €</p>

          <div className="mt-4 flex gap-3">
            {order.status === "approved" && (
              <Button onClick={() => advanceStatus("ready_for_pickup")} disabled={busy}>
                {busy ? "Wird gespeichert..." : "Als abholbereit markieren"}
              </Button>
            )}
            {order.status === "ready_for_pickup" && (
              <Button onClick={() => advanceStatus("issued")} disabled={busy}>
                {busy ? "Wird gespeichert..." : "Als abgeholt markieren"}
              </Button>
            )}
            {order.status === "pending" && (
              <Button variant="secondary" onClick={startEditing}>
                Bestellung bearbeiten
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
