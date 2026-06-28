// src/server/services/parsers/bank.ts
import type { Parser } from "./types.js";
import { truncateSnippet } from "../../lib/sanitize.js";

const BANK_SENDERS: Record<string, string> = {
  "alerts@hdfcbank.net": "HDFC",
  "noreply@icicibank.com": "ICICI",
  "notifications@axisbank.com": "Axis",
  "alerts@sbicard.com": "SBI",
};

const DEBIT_RE = /INR\s*([\d,]+(?:\.\d{1,2})?)\s+debited\s+from/i;
const CREDIT_RE = /INR\s*([\d,]+(?:\.\d{1,2})?)\s+credited\s+to/i;
const MERCHANT_RE = /\b(?:for|towards|at)\s+([^\n.]+)/i;

export const parseBank: Parser = (email) => {
  const bankName = BANK_SENDERS[email.from];
  if (!bankName) return null;

  const debitMatch = email.body.match(DEBIT_RE);
  if (debitMatch) {
    const merchantMatch = email.body.match(MERCHANT_RE);
    return {
      amount: parseFloat(debitMatch[1].replace(/,/g, "")),
      type: "DEBIT",
      merchant: merchantMatch ? merchantMatch[1].trim() : `${bankName} debit`,
      date: email.receivedAt,
      upiApp: "OTHER",
      rawSnippet: truncateSnippet(email.body),
      confidence: merchantMatch ? "HIGH" : "LOW",
    };
  }

  const creditMatch = email.body.match(CREDIT_RE);
  if (creditMatch) {
    const merchantMatch = email.body.match(MERCHANT_RE);
    return {
      amount: parseFloat(creditMatch[1].replace(/,/g, "")),
      type: "CREDIT",
      merchant: merchantMatch ? merchantMatch[1].trim() : `${bankName} credit`,
      date: email.receivedAt,
      upiApp: "OTHER",
      rawSnippet: truncateSnippet(email.body),
      confidence: merchantMatch ? "HIGH" : "LOW",
    };
  }

  return null;
};
