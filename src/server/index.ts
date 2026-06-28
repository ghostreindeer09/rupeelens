// src/server/index.ts
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env, corsOrigins } from "./lib/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { requireAuth } from "./middleware/auth.js";
import { startCronJobs } from "./cron.js";

import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import categoryRoutes from "./routes/categories.js";
import analyticsRoutes from "./routes/analytics.js";
import budgetRoutes from "./routes/budgets.js";
import recurringRoutes from "./routes/recurring.js";
import gmailRoutes from "./routes/gmail.js";

const app = express();

// Trust the first proxy hop (needed for correct client IPs behind a
// load balancer / reverse proxy in production, which rate limiting relies on).
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// --- Security headers ---
app.use(helmet());

// --- CORS lockdown ---
// Only the configured origin(s) may call this API with credentials.
// No wildcard "*" is ever used because we rely on cookies (credentials: true).
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server requests with no Origin header
      // (e.g. curl, the cron job hitting its own API internally).
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
);

// --- Body parsing with strict size limits ---
// Small limit for normal JSON bodies; the CSV import route sets its own
// larger (but still capped) limit on top of this.
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// --- Global rate limiting ---
// Per-route stricter limits (e.g. Gmail sync) are layered on top of this.
app.use("/api", apiLimiter);
app.use("/auth", apiLimiter);

// --- Routes ---
app.use("/auth", authRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/categories", requireAuth, categoryRoutes);
app.use("/api/analytics", requireAuth, analyticsRoutes);
app.use("/api/budgets", requireAuth, budgetRoutes);
app.use("/api/recurring", requireAuth, recurringRoutes);
app.use("/api/gmail", gmailRoutes); // has its own mixed auth (user JWT + cron secret)

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Centralised error handler ---
// Never leak stack traces or internal error details to the client.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  if (err.message.startsWith("CORS:")) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.PORT, () => {
  console.log(`RupeeLens API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  startCronJobs();
});
