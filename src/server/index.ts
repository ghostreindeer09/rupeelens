// src/server/index.ts
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
//
// In production the frontend is served from this same Express process,
// so browser requests carry an Origin header matching this server's own
// host — that's same-origin traffic, not cross-origin, and must be
// allowed even though it won't appear in CORS_ORIGIN (which is meant
// for genuinely separate frontend deployments).
app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);

      // Same-origin check: does the Origin header match this server's
      // own scheme+host? (e.g. the frontend, served by this same process)
      const selfOrigin = `${req.protocol}://${req.get("host")}`;
      if (origin === selfOrigin) return callback(null, true);

      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })(req, res, next);
});

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

// --- Serve the built frontend in production ---
// In local dev, Vite's own dev server handles the frontend on a
// different port (5173), so this block only matters when deployed,
// where a single web service serves both the API and the static build.
if (env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distDir = path.join(__dirname, "../../dist");

  app.use(express.static(distDir));

  // SPA fallback: any non-API, non-auth route serves index.html so
  // client-side routing (React Router) handles the path.
  app.get(/^(?!\/api|\/auth).*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

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
