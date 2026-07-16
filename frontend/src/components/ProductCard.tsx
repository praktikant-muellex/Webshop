import { useState } from "react";
import { Product } from "../api/types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { selectClass } from "./ui/formStyles";

export function ProductCard({ product, onAdd }: { product: Product; onAdd: (sizeLabel: string | null) => void }) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0]?.sizeLabel ?? "");

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{product.name}</h3>
        <span className="whitespace-nowrap font-semibold text-primary-700">{product.priceEur} €</span>
      </div>

      {product.mandatoryForGroup && (
        <span className="mt-1 inline-block w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          Pflicht für {product.mandatoryForGroup.name}
        </span>
      )}

      <p className="mt-2 text-sm text-slate-500">{product.modelDesignation}</p>
      <p className="text-sm text-slate-500">Farbe: {product.color ?? "-"}</p>

      <div className="mt-auto pt-4">
        {product.sizes.length > 0 && (
          <select
            className={`${selectClass} mb-2`}
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            {product.sizes.map((s) => (
              <option key={s.id} value={s.sizeLabel}>
                Größe {s.sizeLabel}
              </option>
            ))}
          </select>
        )}
        <Button className="w-full" onClick={() => onAdd(product.sizes.length > 0 ? selectedSize : null)}>
          In den Warenkorb
        </Button>
      </div>
    </Card>
  );
}
