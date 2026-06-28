// src/server/services/parsers/gpay.ts
import type { Parser } from "./types.js";
import { truncateSnippet } from "../../lib/sanitize.js";

// Matches: "₹250 sent" with merchant nearby, or "₹500 received" similarly.
// GPay's body format varies more than PhonePe's, so we capture amount and
// a following merchant-ish line separately rather than one combined regex.
const SENT_RE = /₹\s*([\d,]+(?:\.\d{1,2})?)\s+sent/i;
const RECEIVED_RE = /₹\s*([\d,]+(?:\.\d{1,2})?)\s+received/i;
const TO_RE = /\bto\s+([^\n.]+)/i;
const FROM_RE = /\bfrom\s+([^\n.]+)/i;

export const parseGPay: Parser = (email) => {
  if (!email.from.includes("noreply@gpay.app.in")) return null;

  const sentMatch = email.body.match(SENT_RE);
  if (sentMatch) {
    const merchantMatch = email.body.match(TO_RE);
    if (!merchantMatch) return null;
    return {
      amount: parseFloat(sentMatch[1].replace(/,/g, "")),
      type: "DEBIT",
      merchant: merchantMatch[1].trim(),
      date: email.receivedAt,
      upiApp: "GPAY",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  const receivedMatch = email.body.match(RECEIVED_RE);
  if (receivedMatch) {
    const merchantMatch = email.body.match(FROM_RE);
    if (!merchantMatch) return null;
    return {
      amount: parseFloat(receivedMatch[1].replace(/,/g, "")),
      type: "CREDIT",
      merchant: merchantMatch[1].trim(),
      date: email.receivedAt,
      upiApp: "GPAY",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  return null;
};
