// src/server/routes/transactions.ts
import { Router } from "express";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { requireCsrf } from "../middleware/csrf.js";
import { csvImportLimiter } from "../middleware/rateLimit.js";
import { sanitizeText } from "../lib/sanitize.js";
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  idParamSchema,
  csvRowSchema,
} from "../lib/schemas.js";

const router = Router();

router.get("/", validate(listTransactionsQuerySchema, "query"), async (req, res) => {
  const { month, year, category, source, page, pageSize } = req.query as any;
  const userId = req.userId!;

  const where: any = { userId, deletedAt: null };
  if (month && year) {
    where.date = {
      gte: new Date(year, month - 1, 1),
      lt: new Date(year, month, 1),
    };
  }
  if (category) where.categoryId = category;
  if (source) where.source = source;

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true, account: true },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

router.post("/", requireCsrf, validate(createTransactionSchema), async (req, res) => {
  const userId = req.userId!;
  const body = req.body as any;

  const txn = await prisma.transaction.create({
    data: {
      userId,
      amount: body.amount,
      type: body.type,
      merchant: sanitizeText(body.merchant, 200),
      note: body.note ? sanitizeText(body.note, 500) : null,
      date: body.date,
      categoryId: body.categoryId ?? null,
      accountId: body.accountId ?? null,
      source: "MANUAL",
      isReviewed: true,
    },
  });

  res.status(201).json(txn);
});

router.put(
  "/:id",
  requireCsrf,
  validate(idParamSchema, "params"),
  validate(updateTransactionSchema),
  async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params as any;
    const body = req.body as any;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Transaction not found" });

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        note: body.note !== undefined ? sanitizeText(body.note, 500) : undefined,
        categoryId: body.categoryId,
        accountId: body.accountId,
        isReviewed: body.isReviewed,
      },
    });

    res.json(updated);
  }
);

router.delete("/:id", requireCsrf, validate(idParamSchema, "params"), async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params as any;

  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: "Transaction not found" });

  await prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } });
  res.json({ success: true });
});

router.post(
  "/import/csv",
  csvImportLimiter,
  requireCsrf,
  express.text({ type: "text/csv", limit: "2mb" }),
  async (req, res) => {
    const userId = req.userId!;
    const raw = req.body;

    if (typeof raw !== "string" || raw.length === 0) {
      return res.status(400).json({ error: "Expected CSV body with Content-Type: text/csv" });
    }

    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 5000) {
      return res.status(400).json({ error: "CSV exceeds maximum of 5000 rows" });
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["amount", "type", "merchant", "date"];
    if (!required.every((r) => header.includes(r))) {
      return res.status(400).json({ error: `CSV must include columns: ${required.join(", ")}` });
    }

    let imported = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",");
      const rowObj: Record<string, string> = {};
      header.forEach((h, idx) => (rowObj[h] = cells[idx]?.trim() ?? ""));

      const parsed = csvRowSchema.safeParse(rowObj);
      if (!parsed.success) {
        failed++;
        if (errors.length < 20) {
          errors.push({ row: i + 1, message: parsed.error.issues[0]?.message ?? "Invalid row" });
        }
        continue;
      }

      await prisma.transaction.create({
        data: {
          userId,
          amount: parsed.data.amount,
          type: parsed.data.type,
          merchant: sanitizeText(parsed.data.merchant, 200),
          note: parsed.data.note ? sanitizeText(parsed.data.note, 500) : null,
          date: parsed.data.date,
          source: "CSV_IMPORT",
          isReviewed: true,
        },
      });
      imported++;
    }

    res.json({ imported, failed, errors });
  }
);

export default router;
