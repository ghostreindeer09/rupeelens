// src/server/cron.ts
//
// Hourly sync for every user who has connected Gmail. Calls the API's
// own /api/gmail/sync endpoint using the cron shared secret, rather than
// importing syncUserGmail directly — this keeps exactly one code path
// for "trigger a sync" and exercises the same auth middleware the
// manual button uses.

import cron from "node-cron";
import { prisma } from "./lib/prisma.js";
import { env } from "./lib/env.js";

async function triggerSyncForUser(userId: string) {
  const res = await fetch(`http://localhost:${env.PORT}/api/gmail/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": env.CRON_SHARED_SECRET,
    },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`sync endpoint returned ${res.status}: ${body}`);
  }
}

async function runHourlySync() {
  const users = await prisma.user.findMany({
    where: { gmailConnected: true },
    select: { id: true },
  });

  console.log(`[cron] starting sync for ${users.length} connected users`);

  for (const user of users) {
    try {
      await triggerSyncForUser(user.id);
    } catch (err) {
      // One user's failure (expired token, API error) must not abort
      // the batch for everyone else.
      console.error(`[cron] sync failed for user ${user.id}:`, (err as Error).message);
    }
  }
}

export function startCronJobs() {
  // Every hour, on the hour.
  cron.schedule("0 * * * *", () => {
    runHourlySync().catch((err) => console.error("[cron] unhandled error:", err));
  });

  console.log("[cron] hourly Gmail sync scheduled");
}
