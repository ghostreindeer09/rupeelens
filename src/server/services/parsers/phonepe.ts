// src/server/services/parsers/phonepe.ts
import type { Parser } from "./types.js";
import { truncateSnippet } from "../../lib/sanitize.js";

// Matches: "Rs. 250 sent to Swiggy" / "Rs. 500 received from Ramesh Kumar"
const SENT_RE = /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+sent\s+to\s+([^\n.]+)/i;
const RECEIVED_RE = /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+received\s+from\s+([^\n.]+)/i;

export const parsePhonePe: Parser = (email) => {
  if (!email.from.includes("noreply@phonepe.com")) return null;
  if (!/phonepe/i.test(email.subject)) return null;

  const sentMatch = email.body.match(SENT_RE);
  if (sentMatch) {
    return {
      amount: parseFloat(sentMatch[1].replace(/,/g, "")),
      type: "DEBIT",
      merchant: sentMatch[2].trim(),
      date: email.receivedAt,
      upiApp: "PHONEPE",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  const receivedMatch = email.body.match(RECEIVED_RE);
  if (receivedMatch) {
    return {
      amount: parseFloat(receivedMatch[1].replace(/,/g, "")),
      type: "CREDIT",
      merchant: receivedMatch[2].trim(),
      date: email.receivedAt,
      upiApp: "PHONEPE",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  return null;
};
