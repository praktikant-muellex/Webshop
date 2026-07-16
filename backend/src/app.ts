import "express-async-errors";
import express from "express";
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
  const app = express();

  // Render/Netlify sit behind a reverse proxy — needed so req.secure and
  // rate-limit's IP detection reflect the real client, not the proxy hop.
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json());

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
        sameSite: "lax",
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
