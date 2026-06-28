// src/server/middleware/cronAuth.ts
//
// The hourly cron job calls the same sync logic as the user-facing
// "sync now" button, but it isn't a logged-in user — it's our own
// node-cron process. This middleware lets an internal call authenticate
// with a shared secret instead of a user JWT, so the sync endpoint isn't
// either (a) wide open, or (b) forced to fake a user session.
//
// This is intentionally NOT the same secret as JWT_SECRET — a leak of
// one must not compromise the other.

import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../lib/env.js";

const HEADER = "x-cron-secret";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header(HEADER);
  if (!provided || !timingSafeEqual(provided, env.CRON_SHARED_SECRET)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
