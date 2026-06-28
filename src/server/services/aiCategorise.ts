// src/server/services/aiCategorise.ts
//
// AI fallback for merchant categorisation, used only when:
//   1. The regex parser had LOW confidence, AND
//   2. The keyword map (keywordMap.ts) found no match.
//
// Provider is selected via AI_PROVIDER env var. Today: Groq's free tier
// (Llama 3.3 70B) — fast, free, no card required. Later: flip
// AI_PROVIDER=anthropic in .env and this file is the only place that
// changes call-site-wise; nothing else in the app needs to know which
// provider is active.

import { env } from "../lib/env.js";

const SYSTEM_PROMPT =
  "You are a personal finance categorisation engine for Indian users. " +
  "Given a UPI merchant name, return exactly one category from the provided list. " +
  "Respond with only the category name, nothing else — no punctuation, no explanation.";

function buildPrompt(merchant: string, categories: string[]): string {
  return `Merchant: "${merchant}"\nCategories: ${categories.join(", ")}\n\nCategory:`;
}

async function categoriseWithGroq(merchant: string, categories: string[]): Promise<string> {
  const { default: Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: env.GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: env.GROQ_MODEL,
    max_tokens: 20,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(merchant, categories) },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

async function categoriseWithAnthropic(merchant: string, categories: string[]): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 20,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(merchant, categories) }],
  });

  const block = message.content[0];
  return block?.type === "text" ? block.text.trim() : "";
}

/**
 * Calls the configured AI provider to guess a category, with a hard
 * timeout and graceful fallback to "Other" on any failure (network error,
 * rate limit, malformed response, or a guess outside the allowed list).
 * This function must never throw — a flaky AI call should never break
 * the sync pipeline.
 */
export async function categoriseMerchant(
  merchant: string,
  availableCategories: string[]
): Promise<string> {
  const FALLBACK = "Other";
  const TIMEOUT_MS = 8000;

  try {
    const call =
      env.AI_PROVIDER === "anthropic"
        ? categoriseWithAnthropic(merchant, availableCategories)
        : categoriseWithGroq(merchant, availableCategories);

    const result = await Promise.race([
      call,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("AI categorisation timed out")), TIMEOUT_MS)
      ),
    ]);

    return availableCategories.includes(result) ? result : FALLBACK;
  } catch (err) {
    console.error("[categorise] AI fallback failed:", (err as Error).message);
    return FALLBACK;
  }
}
