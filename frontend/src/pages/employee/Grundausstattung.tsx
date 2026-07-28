import { PageHeading } from "../../components/ui/PageHeading";
import { Card } from "../../components/ui/Card";

const IMAGE_GROUPS = [
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
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold text-primary-500">Fahrer</h2>
          <p className="text-sm text-slate-700">
            Für Fahrer besteht keine Pflicht zur vollen Saison-Ausstattung wie unten bei Beifahrer
            gezeigt. Beim Verlassen des Fahrzeugs im öffentlichen Straßenverkehr genügt mindestens
            ein Warnschutzgurt oder eine Warnschutzweste.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="p-5 pb-0 text-lg font-bold text-primary-500">Beifahrer</h2>
          <div className="grid grid-cols-2 px-5 pt-4">
            <span className="text-lg font-bold text-secondary-600">Frühling</span>
            <span className="text-lg font-bold text-secondary-600">Sommer</span>
          </div>
          <img
            src="/grundausstattung/fahrer-beifahrer.png"
            alt="Grundausstattung Beifahrer"
            loading="lazy"
            className="w-full"
          />
        </Card>

        {IMAGE_GROUPS.map((group) => (
          <Card key={group.title} className="overflow-hidden">
            <img src={group.imageUrl} alt={group.title} loading="lazy" className="w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
