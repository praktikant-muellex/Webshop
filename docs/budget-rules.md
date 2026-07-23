# Budget-Regeln (aus "Katalog für Arbeitskleidung", Stand August 2025)

Diese Datei ist die Klartext-Referenz für die Logik in `backend/src/services/budgetLedger.ts`.
Bei Änderungen des Katalogs zuerst hier, dann im Code (und in `seed/employee-groups.json`) anpassen.

## Mitarbeitergruppen & Budgets

| Gruppe (code) | Grundausstattungsbudget (einmalig) | Folgebudget (jährlich) |
|---|---|---|
| Fahrer (`fahrer`) | 500 € | 200 € |
| Beifahrer (`beifahrer`) | 650 € | 250 € |
| Laderfahrer & Anlagenbediener (`laderfahrer_anlagenbediener`) | 500 € | 200 € |
| Instandhaltung & Hofpersonal (`instandhaltung_hofpersonal`) | 650 € | 330 € |

## Probezeit (Monat 0-1)

Neue Mitarbeiter erhalten eine **Probegarnitur** zur vorübergehenden Nutzung (kein Budget-Bezug,
nur Tracking in `loaner_records`). Diese ist nach Ablauf des 1. Monats vollständig zu retournieren.

## Grundausstattungsbudget (einmalig)

Wird ab Monat 2 (nach erfolgreichem Abschluss der Probezeit) freigeschaltet:
`freigabe_datum = hire_date + 2 Monate`. Lazy geprüft (z.B. bei Login): falls `heute >= freigabe_datum`
und noch kein `base_grant`-Ledger-Eintrag existiert, wird einer mit `amount_eur = base_budget_eur`
der Gruppe eingefügt.

## Jährliches Folgebudget

Wird jedes Jahr am **1. Juli** freigeschaltet. Umgesetzt durch einen täglichen Cron-Job
(`backend/src/jobs/annualGrant.ts`), der für jeden aktiven Mitarbeiter prüft, ob heute ein Grant fällig
ist und ob dafür bereits ein Ledger-Eintrag mit passendem `effective_date` existiert (Idempotenz).

### Aliquotierung im Eintrittsjahr

- **Eintritt zwischen 1. Jänner und 30. Juni**: erstes Folgebudget wird anteilig für den Zeitraum bis
  30. Juni berechnet: `anteilig = annual_budget_eur * (Monate von hire_date bis 30. Juni, inklusive) / 12`.
  Beispiel: Eintritt im März → 4/12 des Jahresbudgets.
- **Eintritt ab 1. Juli**: erstes volles Jahresbudget erst am 1. Juli des **Folgejahres**.

Jeder Ledger-Eintrag vom Typ `annual_grant` / `annual_grant_prorated` bekommt eine `note`, die die genaue
Rechnung in Klartext festhält (z.B. `"Anteiliges Folgebudget 4/12 (Einstellung 2026-03-15)"`).

## Rollover

Nicht genutztes Budget wird automatisch und kumulativ ins Folgejahr übertragen — ergibt sich direkt
daraus, dass der `budget_ledger` niemals zurückgesetzt wird. Laufendes Guthaben eines Mitarbeiters ist
immer `SUM(amount_eur)` über alle seine Ledger-Einträge, nie ein separat gespeicherter Zählerstand.

## Keine Auszahlung

Budget kann niemals als Bargeld ausgezahlt werden — es gibt keinen `payout`-Ledger-Typ, und keine
API/Adminfunktion darf Guthaben in eine Auszahlung umwandeln.

## Beendigung des Dienstverhältnisses

Bei Eigenkündigung innerhalb der letzten drei Monate kann das Unternehmen bereits getätigte Bestellungen
zurückfordern/rückverrechnen. Umsetzung: beim Setzen von `employment_status = resigned` mit einem
`resignation_date` wird einmalig
`UPDATE orders SET reclaim_flag = true WHERE user_id = ? AND submitted_at >= (resignation_date - interval '3 months')`
ausgeführt. Bei Beendigung aus anderen Gründen erfolgt laut Katalog eine Einzelfallprüfung — das System
markiert nur, entscheidet nicht automatisch.

## Verpflichtende Grundausstattung je Gruppe (Kontext, nicht im Datenmodell erzwungen)

Der Katalogtext beschreibt zusätzlich, welche Kleidungsstücke pro Gruppe **getragen werden müssen**
(unabhängig vom Budget-Mechanismus). Das System bildet dies nur als Filter/Kennzeichnung ab
(`products.mandatory_for_group_id`), erzwingt aber keinen Kauf:

- **Beifahrer**: T-Shirt kurz-/langarm grau mit Sicherheitsgurt/Warnschutzweste, Pullover mit
  Sicherheitsgurt/Warnschutzweste, kurze/lange Warnschutzhose (mit oder ohne Latz), Warnschutz-
  Multifunktionsjacke, Regenhose — je nach Bedarf und Wetterlage. Zusätzlich: graue T-Shirts mit
  großem Firmenlogo am Rücken beim Verlassen des Fahrzeugs im öffentlichen Straßenverkehr.
- **Fahrer**: beim Verlassen des Fahrzeugs mindestens Warnschutzgurt oder Warnschutzweste.
  Hinweis: Das Katalog-Produktfeld "Verpflichtend für" beim Warnschutz-Gurt selbst ist im PDF mit "-"
  angegeben (widerspricht leicht dem Fließtext) — bei einer Katalog-Überarbeitung prüfen, ob das ein
  Fehler im Originaldokument ist.
- **Instandhaltung**: besonders robuste, strapazierfähige Arbeitshose (→ "Cargohose robust").

## Kontakt für Rückfragen zur Bestellung (aus Katalog, nicht Teil des Systems)

Vorgesetzte, Petra, Silvia, Silvana. Ausgabe der Kleidung: Petra Wagner (+43 3112 76 00 35,
petra.wagner@jerichtrans.com).
