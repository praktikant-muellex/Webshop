import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
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
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Keine Berechtigung." });
    }
    next();
  };
}
