// src/server/services/categorise.ts
//
// Orchestrates the full categorisation pipeline:
//   1. Keyword map (instant, free, zero latency)
//   2. AI fallback (Groq free tier today, swappable to Anthropic later)
//   3. "Other" (final safety net — never leave a transaction uncategorised)
//
// This is the single entry point the sync pipeline (sync.ts) calls.
// It deliberately knows nothing about Gmail, parsers, or the database —
// just "merchant name in, category name out."

import { lookupCategory } from "./keywordMap.js";
import { categoriseMerchant as aiCategoriseMerchant } from "./aiCategorise.js";

export async function categorise(
  merchant: string,
  availableCategories: string[]
): Promise<{ category: string; method: "keyword" | "ai" | "default" }> {
  const keywordMatch = lookupCategory(merchant);
  if (keywordMatch && availableCategories.includes(keywordMatch)) {
    return { category: keywordMatch, method: "keyword" };
  }

  const aiGuess = await aiCategoriseMerchant(merchant, availableCategories);
  if (aiGuess !== "Other") {
    return { category: aiGuess, method: "ai" };
  }

  return { category: "Other", method: "default" };
}
