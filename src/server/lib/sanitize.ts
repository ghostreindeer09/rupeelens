// src/server/lib/sanitize.ts
//
// Merchant names, email snippets, and notes ultimately originate from
// untrusted sources (email bodies, user input). Two distinct concerns:
//
// 1. INGEST-TIME sanitization: strip control characters / null bytes
//    before anything touches the database. This is defensive hygiene,
//    not a substitute for output encoding.
// 2. OUTPUT-TIME encoding: the React frontend already escapes text content
//    by default (JSX does not interpret strings as HTML), which is the
//    primary XSS defense. These helpers cover the ingest side and any
//    place we might render raw HTML (e.g. emails, exports) in the future.

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strips control characters and trims. Use on any text pulled from an
 * email body before it is stored (merchant name, raw snippet, etc.).
 */
export function sanitizeText(input: string, maxLength = 500): string {
  return input.replace(CONTROL_CHARS_RE, "").trim().slice(0, maxLength);
}

/**
 * Escapes HTML special characters. Use only if raw text is ever
 * interpolated into an HTML string outside of JSX (e.g. email templates,
 * server-rendered exports). JSX/React already escapes by default, so this
 * is a defense-in-depth helper, not something every render path needs.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Truncates the raw email snippet stored for audit/debugging purposes.
 * Capped well below the 300-char spec target as a hard safety ceiling.
 */
export function truncateSnippet(body: string, maxChars = 300): string {
  return sanitizeText(body, maxChars);
}
