import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchOrder, confirmPickup } from "../../api/orders";
import { Order } from "../../api/types";
import { ApiError } from "../../api/client";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { RejectionReasonBanner } from "../../components/RejectionReasonBanner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { BackButton } from "../../components/ui/BackButton";
import { PageHeading } from "../../components/ui/PageHeading";
import { productLabel } from "../../lib/productLabel";

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOrder(null);
    setError(null);
    if (id) {
      fetchOrder(id)
        .then((data) => {
          if (!cancelled) setOrder(data);
        })
        .catch(() => {
          if (!cancelled) setError("Bestellung konnte nicht geladen werden.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleConfirmPickup = async () => {
    if (!id) return;
    setError(null);
    setConfirming(true);
    try {
      const updated = await confirmPickup(id);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bestätigung fehlgeschlagen.");
    } finally {
      setConfirming(false);
    }
  };

  if (error || !order) {
    return (
      <div>
        <BackButton />
        {error ? <p className="text-sm text-red-600">{error}</p> : <p className="text-sm text-slate-500">Lade...</p>}
      </div>
    );
  }

  const total = order.items.reduce((sum, i) => sum + i.unitPriceEur * i.quantity, 0);

  return (
    <div>
      <BackButton />
      <PageHeading>
        Bestellung vom {new Date(order.submittedAt).toLocaleDateString("de-AT")}
      </PageHeading>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <OrderStatusBadge status={order.status} />
      </div>
      {order.rejectionReason && <RejectionReasonBanner reason={order.rejectionReason} />}

      {order.status === "ready_for_pickup" && (
        <div className="mt-3">
          <Button onClick={handleConfirmPickup} disabled={confirming}>
            {confirming ? "Wird bestätigt..." : "Ich habe die Ware abgeholt"}
          </Button>
        </div>
      )}

      <Card className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">Produkt</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Größe</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Preis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2.5 text-slate-700">
                  <div className="flex items-center gap-3">
                    {i.product.imageUrl && (
                      <img
                        src={i.product.imageUrl}
                        alt={i.product.name}
                        loading="lazy"
                        className="h-10 w-10 rounded object-contain"
                      />
                    )}
                    <span>{productLabel(i.product)}</span>
                  </div>
                </td>
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
