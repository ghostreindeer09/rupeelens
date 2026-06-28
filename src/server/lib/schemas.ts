// src/server/lib/schemas.ts
//
// Centralised Zod schemas. Every route validates against one of these
// before touching the database.

import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.number().positive().finite().max(10_000_000),
  type: z.enum(["DEBIT", "CREDIT"]),
  merchant: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
  date: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export const updateTransactionSchema = z.object({
  note: z.string().trim().max(500).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  isReviewed: z.boolean().optional(),
});

export const listTransactionsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: z.string().uuid().optional(),
  source: z.enum(["GMAIL", "MANUAL", "CSV_IMPORT", "RECURRING"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  icon: z.string().trim().min(1).max(50),
  colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex colour like #F59E0B"),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().trim().min(1).max(50).optional(),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex colour like #F59E0B")
    .optional(),
});

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  limitAmount: z.number().positive().finite().max(10_000_000),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const updateBudgetSchema = z.object({
  limitAmount: z.number().positive().finite().max(10_000_000),
});

export const budgetQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const createRecurringSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.number().positive().finite().max(10_000_000),
  type: z.enum(["DEBIT", "CREDIT"]),
  categoryId: z.string().uuid().optional(),
  dayOfMonth: z.number().int().min(1).max(28),
  upiApp: z.enum(["PHONEPE", "GPAY", "PAYTM", "AMAZON_PAY", "CRED", "OTHER"]).optional(),
});

export const updateRecurringSchema = createRecurringSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const analyticsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export const csvRowSchema = z.object({
  amount: z.coerce.number().positive().finite().max(10_000_000),
  type: z.enum(["DEBIT", "CREDIT"]),
  merchant: z.string().trim().min(1).max(200),
  date: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
});
