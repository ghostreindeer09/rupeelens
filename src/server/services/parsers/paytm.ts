// src/server/services/parsers/paytm.ts
import type { Parser } from "./types.js";
import { truncateSnippet } from "../../lib/sanitize.js";

// Matches: "Rs 250 has been debited ... to Swiggy" / "Rs 500 credited ... from Ramesh"
const DEBIT_RE = /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+has\s+been\s+debited/i;
const CREDIT_RE = /Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has\s+been\s+)?credited/i;
const TO_RE = /\bto\s+([^\n.]+)/i;
const FROM_RE = /\bfrom\s+([^\n.]+)/i;

export const parsePaytm: Parser = (email) => {
  if (!email.from.includes("noreply@paytm.com")) return null;

  const debitMatch = email.body.match(DEBIT_RE);
  if (debitMatch) {
    const merchantMatch = email.body.match(TO_RE);
    if (!merchantMatch) return null;
    return {
      amount: parseFloat(debitMatch[1].replace(/,/g, "")),
      type: "DEBIT",
      merchant: merchantMatch[1].trim(),
      date: email.receivedAt,
      upiApp: "PAYTM",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  const creditMatch = email.body.match(CREDIT_RE);
  if (creditMatch) {
    const merchantMatch = email.body.match(FROM_RE);
    if (!merchantMatch) return null;
    return {
      amount: parseFloat(creditMatch[1].replace(/,/g, "")),
      type: "CREDIT",
      merchant: merchantMatch[1].trim(),
      date: email.receivedAt,
      upiApp: "PAYTM",
      rawSnippet: truncateSnippet(email.body),
      confidence: "HIGH",
    };
  }

  return null;
};
