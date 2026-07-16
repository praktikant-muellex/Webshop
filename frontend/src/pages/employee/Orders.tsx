import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrders } from "../../api/orders";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchMyOrders().then(setOrders);
  }, []);

  return (
    <div>
      <h1>Meine Bestellungen</h1>
      {orders.length === 0 && <p>Noch keine Bestellungen.</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Datum</th>
            <th style={{ textAlign: "left" }}>Positionen</th>
            <th style={{ textAlign: "right" }}>Summe</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const total = o.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);
            return (
              <tr key={o.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(o.submittedAt).toLocaleDateString("de-AT")}</td>
                <td>{o.items.map((i) => i.product.name).join(", ")}</td>
                <td style={{ textAlign: "right" }}>{total} €</td>
                <td>
                  <OrderStatusBadge status={o.status} />
                </td>
                <td>
                  <Link to={`/orders/${o.id}`}>Details</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
