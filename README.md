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

Läuft in Produktion als täglicher Render Cron Job (`backend/render.yaml`). Lokal manuell testbar mit:

```bash
cd backend
npm run grant:run
```

Oder über die Admin-Oberfläche (`/admin/budget-grants`, Button "Jetzt ausführen").

## Deployment

- **Backend + Datenbank**: Render, siehe `backend/render.yaml` (Web Service + Cron Job + Managed
  Postgres). `FRONTEND_ORIGIN` env var nach dem Netlify-Deploy auf die tatsächliche Netlify-URL setzen
  (CORS).
- **Frontend**: Netlify, siehe `frontend/netlify.toml`. `VITE_API_URL` als Netlify-Umgebungsvariable auf
  die Render-Backend-URL setzen.
