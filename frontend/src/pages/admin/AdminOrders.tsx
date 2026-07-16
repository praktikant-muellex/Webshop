import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders, approveOrder, rejectOrder } from "../../api/admin";
import { Order, OrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { ApiError } from "../../api/client";

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "pending", label: "Ausstehend" },
  { value: "approved", label: "Freigegeben" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "ready_for_pickup", label: "Abholbereit" },
  { value: "issued", label: "Ausgegeben" },
];

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchAllOrders({ status: status || undefined }).then(setOrders);
  };

  useEffect(load, [status]);

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      await approveOrder(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Freigabe fehlgeschlagen.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Ablehnungsgrund:");
    if (!reason) return;
    setError(null);
    try {
      await rejectOrder(id, reason);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ablehnung fehlgeschlagen.");
    }
  };

  return (
    <div>
      <h1>Bestellungen</h1>
      <label>
        Status:{" "}
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p style={{ color: "#c62828" }}>{error}</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Datum</th>
            <th style={{ textAlign: "left" }}>Mitarbeiter</th>
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
                <td>{o.user?.email}</td>
                <td>{o.items.map((i) => i.product.name).join(", ")}</td>
                <td style={{ textAlign: "right" }}>{total} €</td>
                <td>
                  <OrderStatusBadge status={o.status} />
                  {o.reclaimFlag && <span title="Rückforderungspflichtig"> ⚠</span>}
                </td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <Link to={`/admin/orders/${o.id}`}>Details</Link>
                  {o.status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(o.id)}>Freigeben</button>
                      <button onClick={() => handleReject(o.id)}>Ablehnen</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
