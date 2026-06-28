// src/server/middleware/csrf.ts
//
// sameSite: "strict" on the session cookie is the primary CSRF defense —
// browsers will not attach the cookie to cross-site requests at all, which
// blocks the vast majority of CSRF attacks outright.
//
// This double-submit token is defense-in-depth for the cases sameSite
// doesn't fully cover (e.g. some older browsers, top-level navigation
// edge cases). The frontend reads the token from a non-httpOnly cookie
// and echoes it back in a custom header; an attacker's cross-site form
// can't read that cookie to forge the header.

import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "../lib/env.js";

const CSRF_COOKIE = "rl_csrf";
const CSRF_HEADER = "x-csrf-token";

export function issueCsrfToken(res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by frontend JS to echo back
    sameSite: "strict",
    secure: env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "Invalid or missing CSRF token" });
  }
  next();
}
