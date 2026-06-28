// src/server/routes/gmail.ts
//
// Mixed auth model:
//   - /connect and /status require a normal logged-in user (requireAuth).
//   - /sync accepts EITHER a logged-in user (manual "sync now" button,
//     rate-limited to once per 15 min) OR the cron shared secret
//     (internal hourly job, calling on behalf of a specific userId).

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireCronSecret } from "../middleware/cronAuth.js";
import { gmailSyncLimiter } from "../middleware/rateLimit.js";
import { requireCsrf } from "../middleware/csrf.js";
import { prisma } from "../lib/prisma.js";
import { syncUserGmail } from "../services/sync.js";

const router = Router();

router.post("/connect", requireAuth, requireCsrf, async (req, res) => {
  res.json({
    redirectTo: "/auth/google",
  });
});

const cronSyncBodySchema = z.object({
  userId: z.string().uuid(),
});

function validateCronBody(body: unknown): string | null {
  const parsed = cronSyncBodySchema.safeParse(body);
  return parsed.success ? parsed.data.userId : null;
}

router.post(
  "/sync",
  (req, res, next) => {
    if (req.header("x-cron-secret")) {
      return requireCronSecret(req, res, next);
    }
    return requireAuth(req, res, next);
  },
  (req, res, next) => {
    if (req.header("x-cron-secret")) return next();
    return requireCsrf(req, res, () => gmailSyncLimiter(req, res, next));
  },
  async (req, res) => {
    let targetUserId: string;

    if (req.header("x-cron-secret")) {
      const parsed = validateCronBody(req.body);
      if (!parsed) return res.status(400).json({ error: "userId required for cron-triggered sync" });
      targetUserId = parsed;
    } else {
      targetUserId = req.userId!;
    }

    try {
      const result = await syncUserGmail(targetUserId);
      res.json(result);
    } catch (err) {
      console.error(`[gmail] sync failed for user ${targetUserId}:`, (err as Error).message);
      res.status(500).json({ error: "Sync failed" });
    }
  }
);

router.get("/status", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailConnected: true, gmailSyncedAt: true },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const importedToday = await prisma.transaction.count({
    where: { userId, source: "GMAIL", createdAt: { gte: startOfDay } },
  });

  res.json({
    gmailConnected: user?.gmailConnected ?? false,
    lastSyncedAt: user?.gmailSyncedAt ?? null,
    importedToday,
  });
});

export default router;
