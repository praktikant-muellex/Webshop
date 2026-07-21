import { useEffect, useState } from "react";
import { Product } from "../api/types";
import { Button } from "./ui/Button";
import { selectClass, labelClass } from "./ui/formStyles";

interface ProductDetailModalProps {
  variants: Product[];
  onAdd: (product: Product, sizeLabel: string | null) => void;
  onClose: () => void;
}

export function ProductDetailModal({ variants, onAdd, onClose }: ProductDetailModalProps) {
  const [variantIndex, setVariantIndex] = useState(0);
  const variant = variants[variantIndex];
  const [selectedSize, setSelectedSize] = useState(variant.sizes[0]?.sizeLabel ?? "");

  useEffect(() => {
    setSelectedSize(variants[variantIndex].sizes[0]?.sizeLabel ?? "");
  }, [variantIndex, variants]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-primary-500">{variant.name}</h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="shrink-0 text-2xl leading-none text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-4">
            {variant.imageUrl ? (
              <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm text-slate-400">Kein Bild</span>
            )}
          </div>

          <div className="flex flex-col">
            {variant.mandatoryForGroup && (
              <span className="mb-2 inline-block w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                Pflicht für {variant.mandatoryForGroup.name}
              </span>
            )}
            <p className="text-sm text-slate-500">{variant.modelDesignation}</p>
            <p className="mt-1 text-2xl font-semibold text-primary-700">{variant.priceEur} €</p>

            {variants.length > 1 && (
              <div className="mt-4">
                <p className={labelClass}>Farbe</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantIndex(i)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        i === variantIndex
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {v.color ?? "-"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variant.sizes.length > 0 && (
              <div className="mt-4">
                <label className={labelClass}>Größe</label>
                <select
                  className={selectClass}
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  {variant.sizes.map((s) => (
                    <option key={s.id} value={s.sizeLabel}>
                      Größe {s.sizeLabel}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              className="mt-6 w-full"
              onClick={() => {
                onAdd(variant, variant.sizes.length > 0 ? selectedSize : null);
                onClose();
              }}
            >
              In den Warenkorb
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
