// src/server/lib/env.ts
//
// Validates all required environment variables at process startup.
// Fails fast and loudly rather than letting a missing/malformed secret
// cause confusing runtime errors (or worse, silent insecure fallbacks).

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z.string().url("GOOGLE_REDIRECT_URI must be a valid URL"),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)"),

  AI_PROVIDER: z.enum(["groq", "anthropic"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-4-5-20251001"),

  CRON_SHARED_SECRET: z.string().min(16, "CRON_SHARED_SECRET must be at least 16 characters"),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // Cross-field validation: the AI provider selected must have its key set.
  if (parsed.data.AI_PROVIDER === "groq" && !parsed.data.GROQ_API_KEY) {
    console.error("❌ AI_PROVIDER=groq but GROQ_API_KEY is not set.");
    process.exit(1);
  }
  if (parsed.data.AI_PROVIDER === "anthropic" && !parsed.data.ANTHROPIC_API_KEY) {
    console.error("❌ AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
