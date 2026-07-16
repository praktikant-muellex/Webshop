import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchAllOrders, updateOrderStatus } from "../../api/admin";
import { Order } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { ApiError } from "../../api/client";

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

  if (!order) return <p>Lade...</p>;

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <h1>Bestellung von {order.user?.email}</h1>
      <p>
        Status: <OrderStatusBadge status={order.status} />
      </p>
      {order.reclaimFlag && <p style={{ color: "#c62828" }}>Rückforderungspflichtig (Austritt innerhalb 3 Monaten).</p>}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}

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

      {order.status === "approved" && (
        <button onClick={() => advanceStatus("ready_for_pickup")}>Als abholbereit markieren</button>
      )}
      {order.status === "ready_for_pickup" && (
        <button onClick={() => advanceStatus("issued")}>Als ausgegeben markieren</button>
      )}
    </div>
  );
}
