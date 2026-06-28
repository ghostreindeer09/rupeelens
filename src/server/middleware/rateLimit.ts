// src/server/middleware/rateLimit.ts
//
// Two tiers:
//   - apiLimiter: generous, applies to all /api and /auth traffic.
//   - gmailSyncLimiter: strict, enforces the "max once per 15 minutes
//     per user" requirement from the spec's security section, on top
//     of the general limiter.
//
// Rate limit state is in-memory by default (fine for a single instance).
// If you ever run multiple server instances, swap the store for a
// Redis-backed one (rate-limit-redis) so limits are shared across instances.

import rateLimit from "express-rate-limit";
import type { Request } from "express";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // generous ceiling for normal app usage across all routes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

// Stricter limiter for unauthenticated/auth-adjacent endpoints
// (login redirect, OAuth callback) to slow down brute-force / scripted abuse.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again shortly." },
});

// Gmail sync: max once per 15 minutes PER USER, per the security spec.
// Keyed by authenticated user id (set by requireAuth) rather than IP,
// since the same user could call from different networks.
export const gmailSyncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.userId ?? req.ip ?? "unknown",
  message: { error: "Gmail sync can only be triggered once every 15 minutes." },
});

// CSV import: separate, modest limit — large parsing jobs are expensive,
// so this is intentionally tighter than the general API limiter.
export const csvImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.userId ?? req.ip ?? "unknown",
  message: { error: "Too many CSV imports. Please try again later." },
});
