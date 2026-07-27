import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders, approveOrder, rejectOrder } from "../../api/admin";
import { Order, OrderStatus } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { RejectOrderModal } from "../../components/RejectOrderModal";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { selectClass, labelClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";
import { productLabel } from "../../lib/productLabel";
import { employeeLabel } from "../../lib/employeeLabel";

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "pending", label: "Ausstehend" },
  { value: "approved", label: "Freigegeben" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "ready_for_pickup", label: "Abholbereit" },
  { value: "issued", label: "Abgeholt" },
];

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const load = () => {
    fetchAllOrders({ status: status || undefined })
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch(() => setError("Bestellungen konnten nicht geladen werden."));
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

  const confirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);
    setRejectError(null);
    try {
      await rejectOrder(rejectTarget.id, reason);
      setRejectTarget(null);
      load();
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : "Ablehnung fehlgeschlagen.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div>
      <PageHeading>Bestellungen</PageHeading>

      <div className="mt-4">
        <label className={labelClass}>Status</label>
        <select
          className={`${selectClass} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">Datum</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Mitarbeiter</th>
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
                  <td className="px-4 py-2.5 text-slate-700">{o.user ? employeeLabel(o.user) : "-"}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {o.items.map((i) => productLabel(i.product)).join(", ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">{total} €</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <OrderStatusBadge status={o.status} />
                      {o.reclaimFlag && (
                        <span title="Rückforderungspflichtig" className="text-amber-500">
                          ⚠
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/orders/${o.id}`}
                        className="inline-block rounded-md border-2 border-secondary-500 bg-white px-3 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-secondary-50"
                      >
                        Details
                      </Link>
                      {o.status === "pending" && (
                        <>
                          <Button variant="secondary" className="px-2.5 py-1" onClick={() => handleApprove(o.id)}>
                            Freigeben
                          </Button>
                          <Button
                            variant="danger"
                            className="px-2.5 py-1"
                            onClick={() => {
                              setRejectError(null);
                              setRejectTarget(o);
                            }}
                          >
                            Ablehnen
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {rejectTarget && (
        <RejectOrderModal
          employeeLabel={rejectTarget.user ? employeeLabel(rejectTarget.user) : "-"}
          submitting={rejecting}
          error={rejectError}
          onConfirm={confirmReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
