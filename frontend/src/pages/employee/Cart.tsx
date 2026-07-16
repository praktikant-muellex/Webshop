import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { submitOrder } from "../../api/orders";
import { ApiError } from "../../api/client";

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
        <h1>Warenkorb</h1>
        <p>Dein Warenkorb ist leer.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Warenkorb</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Produkt</th>
            <th style={{ textAlign: "left" }}>Größe</th>
            <th style={{ textAlign: "right" }}>Preis</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} style={{ borderTop: "1px solid #eee" }}>
              <td>{line.product.name}</td>
              <td>{line.sizeLabel ?? "-"}</td>
              <td style={{ textAlign: "right" }}>{line.product.priceEur} €</td>
              <td>
                <button onClick={() => removeLine(i)}>Entfernen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontWeight: "bold" }}>Gesamt: {total} €</p>
      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Wird gesendet..." : "Bestellung absenden"}
      </button>
      <p style={{ fontSize: "0.85rem", color: "#555" }}>
        Die Bestellung geht als "ausstehend" ein und muss von einem Vorgesetzten freigegeben werden,
        bevor dein Guthaben belastet wird.
      </p>
    </div>
  );
}
