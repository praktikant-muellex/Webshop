import { PageHeading } from "../../components/ui/PageHeading";
import { Card } from "../../components/ui/Card";

const GROUPS = [
  {
    title: "Fahrer & Beifahrer",
    imageUrl: "/grundausstattung/fahrer-beifahrer.png",
  },
  {
    title: "Instandhaltung & Reinigung / Laderfahrer & Anlagenbediener",
    imageUrl: "/grundausstattung/instandhaltung-laderfahrer.png",
  },
];

export function Grundausstattung() {
  return (
    <div>
      <PageHeading>Grundausstattung</PageHeading>
      <p className="mb-6 max-w-2xl text-sm font-semibold text-primary-500">
        Beispielhafte Zusammenstellung der Grundausstattung je Mitarbeitergruppe und Saison, laut
        Arbeitskleidungskatalog. Die konkrete Auswahl an Größen und Farben triffst du im Katalog.
      </p>

      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <Card key={group.title} className="overflow-hidden">
            <img src={group.imageUrl} alt={group.title} className="w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
