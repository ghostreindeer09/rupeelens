// src/server/services/parsers/index.ts
import type { Parser, RawEmail, ParsedTransaction } from "./types.js";
import { parsePhonePe } from "./phonepe.js";
import { parseGPay } from "./gpay.js";
import { parsePaytm } from "./paytm.js";
import { parseBank } from "./bank.js";

const PARSERS: Parser[] = [parsePhonePe, parseGPay, parsePaytm, parseBank];

export function parseEmail(email: RawEmail): ParsedTransaction | null {
  for (const parser of PARSERS) {
    const result = parser(email);
    if (result) return result;
  }
  return null;
}

export type { RawEmail, ParsedTransaction };
