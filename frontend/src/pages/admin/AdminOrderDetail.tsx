import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAllOrders, updateOrderStatus } from "../../api/admin";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeading } from "../../components/ui/PageHeading";
import { productLabel } from "../../lib/productLabel";

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchAllOrders().then((all) => setOrder(all.find((o) => o.id === id) ?? null));
  };

  useEffect(load, [id]);

  const advanceStatus = async (status: "ready_for_pickup" | "issued") => {
    if (!id) return;
    setError(null);
    try {
      await updateOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Statusänderung fehlgeschlagen.");
    }
  };

  if (!order) return <p className="text-sm text-slate-500">Lade...</p>;

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <PageHeading>Bestellung von {order.user?.email}</PageHeading>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.reclaimFlag && (
        <p className="mt-2 text-sm text-amber-700">
          ⚠ Rückforderungspflichtig (Austritt innerhalb 3 Monaten).
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <Card className="mt-4 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Produkt</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Größe</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Preis</th>
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
          <Button onClick={() => advanceStatus("ready_for_pickup")}>Als abholbereit markieren</Button>
        )}
        {order.status === "ready_for_pickup" && (
          <Button onClick={() => advanceStatus("issued")}>Als ausgegeben markieren</Button>
        )}
      </div>
    </div>
  );
}
