import { Product } from "../api/types";
import { Card } from "./ui/Card";

interface ProductGroupCardProps {
  name: string;
  variants: Product[];
  onOpen: () => void;
}

export function ProductGroupCard({ name, variants, onOpen }: ProductGroupCardProps) {
  const first = variants[0];
  const mandatoryGroups = Array.from(
    new Set(variants.filter((v) => v.mandatoryForGroup).map((v) => v.mandatoryForGroup!.name))
  );

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex h-40 items-center justify-center bg-slate-50 p-3">
        {first.imageUrl ? (
          <img src={first.imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">Kein Bild</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-slate-900">{name}</h3>
        {mandatoryGroups.length > 0 && (
          <span className="mt-1 inline-block w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Pflicht für {mandatoryGroups.join(", ")}
          </span>
        )}
        <p className="mt-2 text-sm text-slate-500">{first.modelDesignation}</p>
        {variants.length > 1 && (
          <p className="mt-1 text-xs text-slate-400">{variants.length} Farben verfügbar</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-semibold text-primary-700">{first.priceEur} €</span>
          <span className="text-sm font-medium text-primary-600">Auswählen →</span>
        </div>
      </div>
    </Card>
  );
}
