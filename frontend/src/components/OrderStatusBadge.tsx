import { OrderStatus } from "../api/types";

const LABELS: Record<OrderStatus, string> = {
  pending: "Ausstehend",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  ready_for_pickup: "Abholbereit",
  issued: "Ausgegeben",
};

const COLORS: Record<OrderStatus, string> = {
  pending: "#e0a800",
  approved: "#2e7d32",
  rejected: "#c62828",
  ready_for_pickup: "#1565c0",
  issued: "#555555",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "0.75rem",
        color: "white",
        background: COLORS[status],
        fontSize: "0.85rem",
      }}
    >
      {LABELS[status]}
    </span>
  );
}
