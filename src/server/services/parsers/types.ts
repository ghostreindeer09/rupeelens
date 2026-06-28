// src/server/services/parsers/types.ts

export type UpiApp = "PHONEPE" | "GPAY" | "PAYTM" | "AMAZON_PAY" | "CRED" | "OTHER";
export type TxnType = "DEBIT" | "CREDIT";

export interface ParsedTransaction {
  amount: number; // in rupees, always positive
  type: TxnType;
  merchant: string; // who money went to / came from
  date: Date;
  upiApp: UpiApp;
  rawSnippet: string; // first 300 chars for audit
  confidence: "HIGH" | "LOW"; // HIGH = regex matched; LOW = AI fallback
}

export interface RawEmail {
  gmailMessageId: string;
  from: string;
  subject: string;
  body: string; // plain text, HTML already stripped
  receivedAt: Date;
}

export type Parser = (email: RawEmail) => ParsedTransaction | null;
