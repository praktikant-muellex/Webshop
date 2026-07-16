import { useEffect, useState } from "react";
import { fetchProducts } from "../../api/products";
import { Product, ProductCategory } from "../../api/types";
import { ProductCard } from "../../components/ProductCard";
import { useCart } from "../../context/CartContext";
import { ApiError } from "../../api/client";

const CATEGORIES: { value: ProductCategory | ""; label: string }[] = [
  { value: "", label: "Alle Kategorien" },
  { value: "SHIRTS", label: "Shirts" },
  { value: "HOSEN", label: "Hosen" },
  { value: "PULLOVER", label: "Pullover" },
  { value: "JACKEN_WESTEN", label: "Jacken & Westen" },
  { value: "ZUBEHOER", label: "Zubehör" },
];

export function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [error, setError] = useState<string | null>(null);
  const { addLine } = useCart();
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetchProducts({ mandatoryForMe: mandatoryOnly, category: category || undefined })
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Katalog konnte nicht geladen werden."));
  }, [mandatoryOnly, category]);

  return (
    <div>
      <h1>Katalog</h1>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <label>
          <input
            type="checkbox"
            checked={mandatoryOnly}
            onChange={(e) => setMandatoryOnly(e.target.checked)}
          />{" "}
          Nur Pflicht für meine Gruppe
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory | "")}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      {addedMessage && <p style={{ color: "#2e7d32" }}>{addedMessage}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onAdd={(sizeLabel) => {
              addLine(p, sizeLabel);
              setAddedMessage(`${p.name} wurde zum Warenkorb hinzugefügt.`);
              setTimeout(() => setAddedMessage(null), 2000);
            }}
          />
        ))}
      </div>
    </div>
  );
}
