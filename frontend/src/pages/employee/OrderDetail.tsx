import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchOrder } from "../../api/orders";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { Card } from "../../components/ui/Card";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) fetchOrder(id).then(setOrder);
  }, [id]);

  if (!order) return <p className="text-sm text-slate-500">Lade...</p>;

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Bestellung vom {new Date(order.submittedAt).toLocaleDateString("de-AT")}
      </h1>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.rejectionReason && (
        <p className="mt-2 text-sm text-red-600">Ablehnungsgrund: {order.rejectionReason}</p>
      )}

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
                <td className="px-4 py-2.5 text-slate-700">{i.product.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{i.sizeLabel ?? "-"}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{i.unitPriceEur} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-4 text-lg font-semibold text-slate-900">Gesamt: {total} €</p>
    </div>
  );
}
