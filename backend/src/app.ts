import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { ordersRouter } from "./routes/orders";
import { budgetRouter } from "./routes/budget";
import { adminRouter } from "./routes/admin";
import { internalRouter } from "./routes/internal";

export function createApp() {
  // A hardcoded fallback secret sitting in public source would let anyone
  // who reads this repo forge validly-signed session cookies against a real
  // deployment — fail loudly at startup instead of silently accepting it.
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET muss in Produktion gesetzt sein.");
  }

  const app = express();

  // Render/Netlify sit behind a reverse proxy — needed so req.secure and
  // rate-limit's IP detection reflect the real client, not the proxy hop.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      // This is a pure JSON API — it serves no HTML/scripts of its own for
      // a Content-Security-Policy to restrict, so the default CSP here
      // would just be inert header noise (and could complicate PDF
      // downloads for no benefit). The rest of helmet's defaults
      // (X-Content-Type-Options, X-Frame-Options, HSTS, hiding
      // X-Powered-By, etc.) still apply.
      contentSecurityPolicy: false,
      // The frontend (Netlify) is a different origin from this API
      // (Render) by design — same-origin CORP would block it from
      // reading responses despite cors() below explicitly allowing it.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  // Default 100kb is far too small once product photo uploads (admin
  // "Waren Managen") send images as base64 JSON — several MB per variant.
  app.use(express.json({ limit: "20mb" }));

  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // Render (backend) and Netlify (frontend) are different sites, not
        // just different subdomains of one shared domain — every API call
        // from the SPA is a cross-site `fetch`, and SameSite=Lax cookies are
        // only ever attached to top-level navigations, never cross-site
        // fetch/XHR. With "lax" here, the session cookie would be set on
        // login but never sent back on the next request in production,
        // making auth silently fail right after logging in. "None" requires
        // `secure: true`, which is already conditioned on NODE_ENV above.
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/products", productsRouter);
  app.use("/orders", ordersRouter);
  app.use("/budget", budgetRouter);
  app.use("/admin", adminRouter);
  app.use("/internal", internalRouter);

  // Catch-all: with express-async-errors imported above, rejected promises
  // from `async (req, res) => {...}` route handlers reach here too instead
  // of crashing the process (Express 4 doesn't do this on its own).
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Interner Serverfehler." });
  });

  return app;
}
