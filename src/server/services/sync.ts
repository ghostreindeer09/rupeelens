// src/server/services/sync.ts
//
// Orchestrates the full Gmail to Transaction pipeline for one user:
// fetch emails, parse, dedup by emailId, categorise, insert.
//
// Called from both the manual "sync now" route and the hourly cron job.

import { prisma } from "../lib/prisma.js";
import { fetchNewTransactionEmails } from "./gmail.js";
import { parseEmail } from "./parsers/index.js";
import { categorise } from "./categorise.js";
import { sanitizeText } from "../lib/sanitize.js";

export interface SyncResult {
  fetched: number;
  imported: number;
  skippedDuplicate: number;
  skippedUnparsed: number;
  needsReview: number;
}

export async function syncUserGmail(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    fetched: 0,
    imported: 0,
    skippedDuplicate: 0,
    skippedUnparsed: 0,
    needsReview: 0,
  };

  const emails = await fetchNewTransactionEmails(userId);
  result.fetched = emails.length;

  const categories: { id: string; name: string }[] = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    select: { id: true, name: true },
  });
  const categoryNames = categories.map((c: { id: string; name: string }) => c.name);

  for (const email of emails) {
    const existing = await prisma.transaction.findUnique({
      where: { emailId: email.gmailMessageId },
    });
    if (existing) {
      result.skippedDuplicate++;
      continue;
    }

    const parsed = parseEmail(email);
    if (!parsed) {
      result.skippedUnparsed++;
      console.log(`[sync] no parser matched message ${email.gmailMessageId}, skipping`);
      continue;
    }

    const merchant = sanitizeText(parsed.merchant, 200);
    const { category, method } = await categorise(merchant, categoryNames);
    const categoryRecord = categories.find((c: { id: string; name: string }) => c.name === category);

    const isLowConfidence = parsed.confidence === "LOW" || method === "default";

    await prisma.transaction.create({
      data: {
        userId,
        amount: parsed.amount,
        type: parsed.type,
        merchant,
        date: parsed.date,
        categoryId: categoryRecord?.id ?? null,
        source: "GMAIL",
        upiApp: parsed.upiApp,
        emailId: email.gmailMessageId,
        rawEmailSnippet: parsed.rawSnippet,
        isReviewed: !isLowConfidence,
      },
    });

    result.imported++;
    if (isLowConfidence) result.needsReview++;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { gmailSyncedAt: new Date() },
  });

  console.log(
    `[sync] user ${userId}: fetched=${result.fetched} imported=${result.imported} ` +
      `dupes=${result.skippedDuplicate} unparsed=${result.skippedUnparsed} review=${result.needsReview}`
  );

  return result;
}
