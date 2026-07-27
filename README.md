# Arbeitskleidung Webshop (Müllex/Jerichtrans)

Interner Webshop für Mitarbeiter, um Arbeitskleidung aus dem Firmenkatalog zu bestellen. Details zur
Architektur und den Budget-Regeln: [docs/budget-rules.md](docs/budget-rules.md). Der ursprüngliche
Implementierungsplan liegt (nur lokal) unter `.claude/plans/`.

## Projektstruktur

- `backend/` — Node/Express-API, Prisma/Postgres
- `frontend/` — React (Vite) Frontend
- `docs/` — Budget-Regeln als Klartext-Referenz

## Voraussetzungen

- Node.js LTS (v20+) und npm
- Eine Postgres-Datenbank (lokal via Docker, oder direkt eine Render/Neon-Instanz)

## Backend lokal starten

```bash
cd backend
cp .env.example .env      # DATABASE_URL etc. anpassen
npm install
npm run prisma:migrate    # legt Tabellen an
npm run seed               # spielt Katalog + Mitarbeitergruppen + Test-Admin ein
npm run dev                 # startet auf http://localhost:4000
```

Nach dem Seed existiert ein Admin-Account: `admin@muellex.com` / `changeme123` (per
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` überschreibbar) — **Passwort nach dem ersten
Login-Test ändern bzw. für Produktion vorher überschreiben.**

## Frontend lokal starten

```bash
cd frontend
cp .env.example .env      # VITE_API_URL anpassen falls Backend nicht auf Port 4000 läuft
npm install
npm run dev                 # startet auf http://localhost:5173
```

## Jährlicher Budget-Grant-Job

Läuft in Produktion als täglicher Render Cron Job (`render.yaml`). Lokal manuell testbar mit:

```bash
cd backend
npm run grant:run
```

Oder über die Admin-Oberfläche (`/admin/budget-grants`, Button "Jetzt ausführen").

## Tests

Automatisierte Tests fürs Backend (Budget-/Guthaben-Rechnungen, Bestell-Freigabe/-Ablehnung,
Inventur-Differenzen) laufen gegen eine eigene, separate Postgres-Datenbank — niemals gegen die
Entwicklungs- oder Produktions-DB, da jeder Testlauf alle Tabellen leert.

```bash
cd backend
cp .env.example .env.test           # DATABASE_URL auf eine ANDERE Datenbank als .env zeigen lassen,
                                     # z.B. .../arbeitskleidung_test statt .../arbeitskleidung
npx prisma migrate deploy           # einmalig: Schema in die Test-DB einspielen (mit DATABASE_URL aus .env.test)
npm test                            # einmaliger Lauf
npm run test:watch                  # bei Bedarf im Watch-Modus
```

Deckt bisher ab: `dateMath.ts` (Monats-/Tages-Rechnung), `budgetLedger.ts` (Grundausstattungs-/
Folgebudget-Freischaltung, Guthaben darf nie negativ werden), `orderApproval.ts` (Freigabe/Ablehnung,
Statuswechsel, Rückforderungs-Markierung) und die zwei zuvor real aufgetretenen Inventur-Bugs
(Differenz-Berechnung bei Stichtagen am selben Tag). Noch nicht abgedeckt: die HTTP-Routen selbst
(Auth-Middleware, Eingabevalidierung) und das Frontend.

## Deployment

- **Backend**: Render, siehe `render.yaml` (Web Service + Cron Job). `FRONTEND_ORIGIN` env var nach dem
  Netlify-Deploy auf die tatsächliche Netlify-URL setzen (CORS).
- **Datenbank**: Neon Postgres (dauerhaft kostenloser Tier, kein 30-Tage-Ablauf wie bei Render's eigener
  Managed Postgres). `DATABASE_URL` manuell in Render's Environment-Einstellungen auf die Neon-Connection-
  String setzen.
- **Frontend**: Netlify, siehe `frontend/netlify.toml`. `VITE_API_URL` als Netlify-Umgebungsvariable auf
  die Render-Backend-URL setzen.
