import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { submitOrder } from "../../api/orders";
import { ApiError } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { PageHeading } from "../../components/ui/PageHeading";

export function Cart() {
  const { lines, removeLine, clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const total = lines.reduce((sum, l) => sum + l.product.priceEur * l.quantity, 0);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await submitOrder(
        lines.map((l) => ({ productId: l.product.id, sizeLabel: l.sizeLabel ?? undefined, quantity: l.quantity }))
      );
      clear();
      navigate("/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Bestellung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div>
        <PageHeading>Warenkorb</PageHeading>
        <p className="mt-4 text-sm text-slate-500">Dein Warenkorb ist leer.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeading>Warenkorb</PageHeading>

      <Card className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Produkt</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">Größe</th>
              <th className="px-4 py-2.5 text-right font-medium text-slate-500">Preis</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">
                  <div className="flex items-center gap-3">
                    {line.product.imageUrl && (
                      <img
                        src={line.product.imageUrl}
                        alt={line.product.name}
                        className="h-10 w-10 rounded object-contain"
                      />
                    )}
                    <span>
                      {line.product.name}
                      {line.product.color && (
                        <span className="text-slate-400"> ({line.product.color})</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{line.sizeLabel ?? "-"}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{line.product.priceEur} €</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    className="text-sm text-red-600 hover:text-red-700"
                    onClick={() => removeLine(i)}
                  >
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-lg font-semibold text-slate-900">Gesamt: {total} €</p>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Wird gesendet..." : "Bestellung absenden"}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-sm text-slate-500">
        Die Bestellung geht als "ausstehend" ein und muss von einem Vorgesetzten freigegeben werden,
        bevor dein Guthaben belastet wird.
      </p>
    </div>
  );
}
