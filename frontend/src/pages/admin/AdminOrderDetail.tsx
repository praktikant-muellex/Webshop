import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAllOrders, updateOrderStatus } from "../../api/admin";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BackButton } from "../../components/ui/BackButton";
import { PageHeading } from "../../components/ui/PageHeading";
import { productLabel } from "../../lib/productLabel";
import { employeeLabel } from "../../lib/employeeLabel";

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      {order.rejectionReason && (
        <div className="mt-2 inline-block w-fit rounded-md border-2 border-red-500 bg-red-50 px-3 py-2">
          <p className="text-sm font-bold text-red-700">Ablehnungsgrund: {order.rejectionReason}</p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

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

      <div className="mt-4">
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
      </div>
    </div>
  );
}
