import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Confirms the session belongs to a still-active account, not just that a
 * userId is present. Without this, resigning an employee mid-session
 * (PATCH /admin/employees/:id) would have no effect until they happened to
 * log out — their existing cookie would keep working everywhere.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht angemeldet." });
  }
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user || user.employmentStatus !== "active") {
    return res.status(401).json({ error: "Nicht angemeldet." });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Nicht angemeldet." });
    }
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user || user.employmentStatus !== "active" || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Keine Berechtigung." });
    }
    next();
  };
}
