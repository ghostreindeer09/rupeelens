// src/server/routes/auth.ts
import { Router } from "express";
import { google } from "googleapis";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { encrypt } from "../lib/crypto.js";
import { issueSessionCookie, clearSessionCookie, requireAuth } from "../middleware/auth.js";
import { issueCsrfToken } from "../middleware/csrf.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
];

function buildOAuthClient() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

router.get("/google", authLimiter, (req, res) => {
  const oauth2Client = buildOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get("/google/callback", authLimiter, async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const oauth2Client = buildOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.id || !profile.email) {
      return res.status(400).json({ error: "Could not retrieve Google profile" });
    }

    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      update: {
        email: profile.email,
        name: profile.name ?? undefined,
        avatarUrl: profile.picture ?? undefined,
        gmailConnected: true,
        gmailAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        gmailRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      },
      create: {
        googleId: profile.id,
        email: profile.email,
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
        gmailConnected: true,
        gmailAccessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
        gmailRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      },
    });

    issueSessionCookie(res, user.id);
    issueCsrfToken(res);

    const frontendUrl = env.CORS_ORIGIN.split(",")[0].trim();
    res.redirect(frontendUrl);
  } catch (err) {
    console.error("[auth] Google OAuth callback failed:", (err as Error).message);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      gmailConnected: true,
      gmailSyncedAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

export default router;
