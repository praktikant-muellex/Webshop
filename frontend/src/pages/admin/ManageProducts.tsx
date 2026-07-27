import { useEffect, useState } from "react";
import { fetchAllProductsAdmin, setProductActive, deleteProductPermanently } from "../../api/adminProducts";
import { Product } from "../../api/types";
import { ApiError } from "../../api/client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { selectClass, labelClass } from "../../components/ui/formStyles";
import { PageHeading } from "../../components/ui/PageHeading";
import { AddProductForm } from "../../components/AddProductForm";

const CATEGORY_OPTIONS = [
  { value: "", label: "Alle Kategorien" },
  { value: "SHIRTS", label: "Shirts" },
  { value: "HOSEN", label: "Hosen" },
  { value: "PULLOVER", label: "Pullover" },
  { value: "JACKEN_WESTEN", label: "Jacken & Westen" },
  { value: "ZUBEHOER", label: "Zubehör" },
];

const CATEGORY_LABELS: Record<string, string> = {
  SHIRTS: "Shirts",
  HOSEN: "Hosen",
  PULLOVER: "Pullover",
  JACKEN_WESTEN: "Jacken & Westen",
  ZUBEHOER: "Zubehör",
};

export function ManageProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAllProductsAdmin(category || undefined)
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch(() => setError("Produkte konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [category]);

  const handleToggleActive = async (product: Product) => {
    const nextActive = !product.active;
    if (nextActive === false && !window.confirm(`"${product.name}" aus dem Katalog entfernen?`)) return;
    setError(null);
    try {
      await setProductActive(product.id, nextActive);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Aktion fehlgeschlagen.");
    }
  };

  const handleDeletePermanently = async (product: Product) => {
    if (
      !window.confirm(`"${product.name}" endgültig löschen? Dies kann NICHT rückgängig gemacht werden.`)
    )
      return;
    setError(null);
    try {
      await deleteProductPermanently(product.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Endgültiges Löschen fehlgeschlagen.");
    }
  };

  return (
    <div>
      <PageHeading>Waren Managen</PageHeading>

      <Button onClick={() => setShowAddForm((open) => !open)}>
        {showAddForm ? "Formular schließen" : "+ Neues Produkt hinzufügen"}
      </Button>

      {showAddForm && (
        <Card className="mt-4 max-w-2xl p-6">
          <AddProductForm
            onCreated={() => {
              setShowAddForm(false);
              load();
            }}
          />
        </Card>
      )}

      <div className="mt-6">
        <label className={labelClass}>Kategorie</label>
        <select className={`${selectClass} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Card className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-secondary-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold text-white">Bild</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Produkt</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Kategorie</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Größen</th>
              <th className="px-4 py-2.5 text-right font-bold text-white">Preis</th>
              <th className="px-4 py-2.5 text-left font-bold text-white">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7}>
                  <Spinner label="Lade Produkte..." />
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {p.name}
                  {p.color && <span className="text-slate-400"> ({p.color})</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                <td className="px-4 py-2.5 text-slate-600">{p.sizes.map((s) => s.sizeLabel).join(", ") || "-"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700">{p.priceEur} €</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.active ? "bg-secondary-100 text-secondary-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {p.active ? "Aktiv" : "Entfernt"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant={p.active ? "danger" : "secondary"} className="px-2.5 py-1" onClick={() => handleToggleActive(p)}>
                      {p.active ? "Entfernen" : "Wiederherstellen"}
                    </Button>
                    {!p.active && (
                      <Button variant="danger" className="px-2.5 py-1" onClick={() => handleDeletePermanently(p)}>
                        Endgültig löschen
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
