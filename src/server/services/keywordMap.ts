// src/server/services/keywordMap.ts
//
// First-pass, zero-cost categorisation. A static table of common Indian
// merchant name fragments mapped straight to a category — no AI call,
// no latency, no rate limit, no cost. Covers the bulk of real-world
// UPI traffic since the same ~100 merchants account for most transactions.
//
// Anything not matched here falls through to the AI fallback in
// categorise.ts. Grow this list over time — it's the cheapest lever
// you have for improving accuracy and cutting AI costs simultaneously.

export const MERCHANT_KEYWORDS: Record<string, string> = {
  // Food & dining
  swiggy: "Food & dining",
  zomato: "Food & dining",
  dominos: "Food & dining",
  dominoz: "Food & dining",
  mcdonald: "Food & dining",
  kfc: "Food & dining",
  starbucks: "Food & dining",
  haldiram: "Food & dining",
  barbeque: "Food & dining",
  behrouz: "Food & dining",
  faasos: "Food & dining",
  freshmenu: "Food & dining",
  eatfit: "Food & dining",

  // Transport
  uber: "Transport",
  olacabs: "Transport",
  ola: "Transport",
  rapido: "Transport",
  irctc: "Transport",
  redbus: "Transport",
  indigo: "Transport",
  indianoil: "Transport",
  hpcl: "Transport",
  bpcl: "Transport",
  fastag: "Transport",
  metro: "Transport",

  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  ajio: "Shopping",
  meesho: "Shopping",
  nykaa: "Shopping",
  bigbasket: "Shopping",
  blinkit: "Shopping",
  zepto: "Shopping",
  dmart: "Shopping",
  reliancetrends: "Shopping",
  reliancedigital: "Shopping",
  croma: "Shopping",
  ikea: "Shopping",

  // Subscriptions
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  hotstar: "Subscriptions",
  primevideo: "Subscriptions",
  sonyliv: "Subscriptions",
  zee5: "Subscriptions",
  youtubepremium: "Subscriptions",
  applemusic: "Subscriptions",
  jiofiber: "Subscriptions",

  // Utilities
  airtel: "Utilities",
  jio: "Utilities",
  vodafoneidea: "Utilities",
  vi: "Utilities",
  tatapower: "Utilities",
  bescom: "Utilities",
  adanielectricity: "Utilities",
  mahadiscom: "Utilities",
  indane: "Utilities",
  hpgas: "Utilities",

  // Health
  apollopharmacy: "Health",
  pharmeasy: "Health",
  netmeds: "Health",
  practo: "Health",
  cultfit: "Health",
  curefit: "Health",
  "1mg": "Health",

  // Entertainment
  bookmyshow: "Entertainment",
  pvr: "Entertainment",
  inoxmovies: "Entertainment",
  steamgames: "Entertainment",
  playstation: "Entertainment",

  // Investments
  zerodha: "Investments",
  groww: "Investments",
  upstox: "Investments",
  coin: "Investments",
  paytmmoney: "Investments",

  // Income (rare in debit-style alerts but useful for credited transactions)
  salary: "Income",
  payroll: "Income",
};

/**
 * Normalises a raw merchant string (lowercase, strip non-alphanumerics)
 * and checks it against the keyword map. Returns the matched category
 * name, or null if nothing matched — caller should fall through to AI.
 */
export function lookupCategory(merchant: string): string | null {
  const normalised = merchant.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalised) return null;

  for (const [keyword, category] of Object.entries(MERCHANT_KEYWORDS)) {
    if (normalised.includes(keyword)) return category;
  }
  return null;
}
