import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchOrder } from "../../api/orders";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) fetchOrder(id).then(setOrder);
  }, [id]);

  if (!order) return <p>Lade...</p>;

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <h1>Bestellung vom {new Date(order.submittedAt).toLocaleDateString("de-AT")}</h1>
      <p>
        Status: <OrderStatusBadge status={order.status} />
      </p>
      {order.rejectionReason && <p>Ablehnungsgrund: {order.rejectionReason}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Produkt</th>
            <th style={{ textAlign: "left" }}>Größe</th>
            <th style={{ textAlign: "right" }}>Preis</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{i.product.name}</td>
              <td>{i.sizeLabel ?? "-"}</td>
              <td style={{ textAlign: "right" }}>{i.unitPriceEur} €</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontWeight: "bold" }}>Gesamt: {total} €</p>
    </div>
  );
}
