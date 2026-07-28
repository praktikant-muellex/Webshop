import { FormEvent, useState } from "react";
import { createProduct } from "../api/adminProducts";
import { ApiError } from "../api/client";
import { Button } from "./ui/Button";
import { inputClass, selectClass, labelClass } from "./ui/formStyles";
import { ImageDropzone } from "./ImageDropzone";

const CATEGORY_OPTIONS = [
  { value: "SHIRTS", label: "Shirts" },
  { value: "HOSEN", label: "Hosen" },
  { value: "PULLOVER", label: "Pullover" },
  { value: "JACKEN_WESTEN", label: "Jacken & Westen" },
  { value: "ZUBEHOER", label: "Zubehör" },
];

// Matches the two size systems already used across the real catalog
// (backend/seed/products.json): letter sizes XS through 8XL, or even-number
// clothing sizes (pants etc., always even in German sizing). Anything else
// ("asdf", "Groß", "1") isn't a real garment size.
const ALPHA_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL"];
const MIN_NUMERIC_SIZE = 30;
const MAX_NUMERIC_SIZE = 80;

/** Returns the canonical size label (uppercased letter size, or the number without leading zeros), or null if not a real size. */
function normalizeSize(raw: string): string | null {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (ALPHA_SIZES.includes(upper)) return upper;
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    // String(n), not the raw trimmed text — "044" must normalize to the same
    // "44" as a plain "44" entry, or the two would dedupe as distinct sizes.
    if (n % 2 === 0 && n >= MIN_NUMERIC_SIZE && n <= MAX_NUMERIC_SIZE) return String(n);
  }
  return null;
}

interface VariantRow {
  key: number;
  color: string;
  imageDataUrl: string | null;
}

let nextKey = 1;

export function AddProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0].value);
  const [priceEur, setPriceEur] = useState("");
  const [sizesRaw, setSizesRaw] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([{ key: nextKey++, color: "", imageDataUrl: null }]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addVariant = () => setVariants((prev) => [...prev, { key: nextKey++, color: "", imageDataUrl: null }]);
  const removeVariant = (key: number) => setVariants((prev) => prev.filter((v) => v.key !== key));
  const updateVariant = (key: number, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const price = Number(priceEur);
    if (!name.trim()) return setError("Produktname erforderlich.");
    if (!Number.isInteger(price) || price <= 0) return setError("Preis muss eine positive ganze Zahl sein.");
    const rawSizes = sizesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawSizes.length === 0) return setError("Mindestens eine Größe angeben (kommagetrennt).");
    const normalizedSizes = rawSizes.map(normalizeSize);
    const firstInvalid = rawSizes[normalizedSizes.findIndex((s) => s === null)];
    if (firstInvalid !== undefined) {
      return setError(
        `"${firstInvalid}" ist keine gültige Größe. Erlaubt sind Buchstabengrößen (XS-8XL) oder gerade Zahlen (${MIN_NUMERIC_SIZE}-${MAX_NUMERIC_SIZE}).`
      );
    }
    const sizes = [...new Set(normalizedSizes as string[])];
    if (variants.some((v) => !v.imageDataUrl)) return setError("Jede Farbvariante braucht ein Bild.");
    if (variants.length > 1 && variants.some((v) => !v.color.trim())) {
      return setError("Bei mehreren Farbvarianten braucht jede einen Farbnamen.");
    }

    setSubmitting(true);
    try {
      await createProduct({
        name: name.trim(),
        category,
        priceEur: price,
        sizes,
        variants: variants.map((v) => ({ color: v.color.trim() || null, imageDataUrl: v.imageDataUrl! })),
      });
      setMessage(`"${name.trim()}" wurde angelegt.`);
      setName("");
      setPriceEur("");
      setSizesRaw("");
      setVariants([{ key: nextKey++, color: "", imageDataUrl: null }]);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Produktname</label>
        <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Kategorie</label>
          <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Preis (€)</label>
          <input
            type="number"
            step="1"
            min="1"
            className={inputClass}
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Größen (kommagetrennt)</label>
        <input
          type="text"
          className={inputClass}
          placeholder="z.B. S, M, L, XL oder 44, 46, 48"
          value={sizesRaw}
          onChange={(e) => setSizesRaw(e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass}>
          Farben & Bilder{" "}
          <span className="font-normal text-slate-400">
            (bei mehr als einer Farbe braucht jede ihr eigenes Bild)
          </span>
        </label>
        <div className="flex flex-wrap gap-4">
          {variants.map((v) => (
            <div key={v.key} className="rounded-lg border border-slate-200 p-3">
              <ImageDropzone value={v.imageDataUrl} onChange={(dataUrl) => updateVariant(v.key, { imageDataUrl: dataUrl })} />
              <input
                type="text"
                className={`${inputClass} mt-2 w-32`}
                placeholder={variants.length > 1 ? "Farbname" : "Farbe (optional)"}
                value={v.color}
                onChange={(e) => updateVariant(v.key, { color: e.target.value })}
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVariant(v.key)}
                  className="mt-1 block text-xs text-red-600 hover:text-red-700"
                >
                  Farbe entfernen
                </button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="neutral" className="mt-3" onClick={addVariant}>
          + Weitere Farbe hinzufügen
        </Button>
      </div>

      {message && (
        <p className="rounded-md bg-secondary-50 px-3 py-2 text-sm text-secondary-800">{message}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Wird angelegt..." : "Produkt anlegen"}
      </Button>
    </form>
  );
}
