import { useEffect, useState } from "react";
import { fetchProducts } from "../../api/products";
import { Product, ProductCategory } from "../../api/types";
import { ProductCard } from "../../components/ProductCard";
import { useCart } from "../../context/CartContext";
import { ApiError } from "../../api/client";
import { selectClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";

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
      <PageHeading>Katalog</PageHeading>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            checked={mandatoryOnly}
            onChange={(e) => setMandatoryOnly(e.target.checked)}
          />
          Nur Pflicht für meine Gruppe
        </label>
        <select
          className={`${selectClass} w-auto`}
          value={category}
          onChange={(e) => setCategory(e.target.value as ProductCategory | "")}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {addedMessage && (
        <p className="mt-4 rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">
          {addedMessage}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
