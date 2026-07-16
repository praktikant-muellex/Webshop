import { OrderStatus } from "../api/types";

const LABELS: Record<OrderStatus, string> = {
  pending: "Ausstehend",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  ready_for_pickup: "Abholbereit",
  issued: "Ausgegeben",
};

const CLASSES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-secondary-100 text-secondary-800",
  rejected: "bg-red-100 text-red-800",
  ready_for_pickup: "bg-blue-100 text-blue-800",
  issued: "bg-slate-200 text-slate-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
