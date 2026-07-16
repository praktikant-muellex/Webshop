import { useState } from "react";
import { Product } from "../api/types";

export function ProductCard({ product, onAdd }: { product: Product; onAdd: (sizeLabel: string | null) => void }) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0]?.sizeLabel ?? "");

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "0.5rem", padding: "1rem" }}>
      <h3>{product.name}</h3>
      {product.mandatoryForGroup && (
        <p style={{ fontSize: "0.8rem", color: "#c62828" }}>
          Pflicht für: {product.mandatoryForGroup.name}
        </p>
      )}
      <p style={{ fontSize: "0.85rem", color: "#555" }}>{product.modelDesignation}</p>
      <p style={{ fontSize: "0.85rem" }}>Farbe: {product.color ?? "-"}</p>
      <p style={{ fontWeight: "bold" }}>{product.priceEur} €</p>

      {product.sizes.length > 0 && (
        <label>
          Größe:{" "}
          <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
            {product.sizes.map((s) => (
              <option key={s.id} value={s.sizeLabel}>
                {s.sizeLabel}
              </option>
            ))}
          </select>
        </label>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={() => onAdd(product.sizes.length > 0 ? selectedSize : null)}>
          In den Warenkorb
        </button>
      </div>
    </div>
  );
}
