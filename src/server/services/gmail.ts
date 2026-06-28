// src/server/services/gmail.ts
//
// Thin wrapper around the Gmail API. Read-only scope only.

import { google } from "googleapis";
import { env } from "../lib/env.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import type { RawEmail } from "./parsers/types.js";

const GMAIL_QUERY =
  "from:(alerts@hdfcbank.net OR noreply@phonepe.com OR noreply@gpay.app.in OR noreply@paytm.com " +
  "OR noreply@icicibank.com OR notifications@axisbank.com OR alerts@sbicard.com) " +
  "subject:(debited OR credited OR payment OR sent OR received OR transaction) newer_than:365d";

function buildOAuthClient() {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

async function getAuthorizedClient(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.gmailAccessToken || !user.gmailRefreshToken) {
    throw new Error(`User ${userId} has no Gmail tokens on file`);
  }

  const oauth2Client = buildOAuthClient();
  oauth2Client.setCredentials({
    access_token: decrypt(user.gmailAccessToken),
    refresh_token: decrypt(user.gmailRefreshToken),
  });

  oauth2Client.on("tokens", async (tokens) => {
    const data: { gmailAccessToken?: string; gmailRefreshToken?: string } = {};
    if (tokens.access_token) data.gmailAccessToken = encrypt(tokens.access_token);
    if (tokens.refresh_token) data.gmailRefreshToken = encrypt(tokens.refresh_token);
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: userId }, data });
    }
  });

  return oauth2Client;
}

function decodeBody(payload: any): string {
  function findPart(part: any, mimeType: string): any {
    if (part.mimeType === mimeType && part.body?.data) return part;
    for (const sub of part.parts ?? []) {
      const found = findPart(sub, mimeType);
      if (found) return found;
    }
    return null;
  }

  const plainPart = findPart(payload, "text/plain");
  if (plainPart) {
    return Buffer.from(plainPart.body.data, "base64").toString("utf8");
  }

  const htmlPart = findPart(payload, "text/html");
  if (htmlPart) {
    const html = Buffer.from(htmlPart.body.data, "base64").toString("utf8");
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  }

  return "";
}

export async function fetchNewTransactionEmails(userId: string): Promise<RawEmail[]> {
  const auth = await getAuthorizedClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: GMAIL_QUERY,
    maxResults: 50,
  });

  const messages = listRes.data.messages ?? [];
  const emails: RawEmail[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const fullMsg = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "full",
    });

    const headers = fullMsg.data.payload?.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value ?? "";
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const body = decodeBody(fullMsg.data.payload);
    const receivedAt = fullMsg.data.internalDate
      ? new Date(parseInt(fullMsg.data.internalDate, 10))
      : new Date();

    emails.push({ gmailMessageId: msg.id, from, subject, body, receivedAt });
    console.log(`[gmail] fetched message ${msg.id}`);
  }

  return emails;
}

export { buildOAuthClient };
