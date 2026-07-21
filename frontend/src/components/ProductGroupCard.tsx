import { Product } from "../api/types";

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
    <div
      className="flex cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-secondary-500 bg-slate-50 shadow-sm transition-shadow hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex h-72 items-center justify-center p-2">
        {first.imageUrl ? (
          <img src={first.imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">Kein Bild</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-semibold leading-tight text-slate-900">{name}</h3>
        {mandatoryGroups.length > 0 && (
          <span className="mt-1 inline-block w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            Pflicht für {mandatoryGroups.join(", ")}
          </span>
        )}
        <p className="mt-1 text-sm text-slate-500">
          {first.modelDesignation}
          {variants.length > 1 && (
            <span className="text-slate-400"> · {variants.length} Farben</span>
          )}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-primary-700">{first.priceEur} €</span>
          <span className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-bold text-white">
            Auswählen →
          </span>
        </div>
      </div>
    </div>
  );
}
