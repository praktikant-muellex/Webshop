import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../../api/orders";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchMyOrders().then(setOrders);
  }, []);

  return (
    <div>
      <PageHeading>Meine Bestellungen</PageHeading>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Noch keine Bestellungen.</p>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Datum</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Positionen</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500">Summe</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
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
                      {o.items.map((i) => i.product.name).join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">{total} €</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <Link to={`/orders/${o.id}`} className="text-primary-600 hover:text-primary-700">
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
