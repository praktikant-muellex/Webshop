import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../../api/orders";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";
import { productLabel } from "../../lib/productLabel";

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setError("Bestellungen konnten nicht geladen werden."));
  }, []);

  return (
    <div>
      <PageHeading>Meine Bestellungen</PageHeading>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Noch keine Bestellungen.</p>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-secondary-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold text-white">Datum</th>
                <th className="px-4 py-2.5 text-left font-bold text-white">Positionen</th>
                <th className="px-4 py-2.5 text-right font-bold text-white">Summe</th>
                <th className="px-4 py-2.5 text-left font-bold text-white">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const total = o.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                      {new Date(o.submittedAt).toLocaleDateString("de-AT")}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {o.items.map((i) => productLabel(i.product)).join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">{total} €</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <Link
                        to={`/orders/${o.id}`}
                        className="inline-block rounded-md border-2 border-secondary-500 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-secondary-50"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
