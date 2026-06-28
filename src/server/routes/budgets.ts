// src/server/routes/budgets.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { requireCsrf } from "../middleware/csrf.js";
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetQuerySchema,
  idParamSchema,
} from "../lib/schemas.js";

const router = Router();

router.get("/", validate(budgetQuerySchema, "query"), async (req, res) => {
  const userId = req.userId!;
  const { month, year } = req.query as any;

  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: true },
  });

  const withSpend = await Promise.all(
    budgets.map(async (b: { categoryId: string; [key: string]: unknown }) => {
      const spend = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          type: "DEBIT",
          deletedAt: null,
          date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
        },
        _sum: { amount: true },
      });
      return { ...b, spentSoFar: spend._sum.amount ?? 0 };
    })
  );

  res.json(withSpend);
});

router.post("/", requireCsrf, validate(createBudgetSchema), async (req, res) => {
  const userId = req.userId!;
  const { categoryId, limitAmount, month, year } = req.body as any;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ userId }, { userId: null }] },
  });
  if (!category) return res.status(404).json({ error: "Category not found" });

  const existing = await prisma.budget.findUnique({
    where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
  });
  if (existing) return res.status(409).json({ error: "Budget already exists for this category/month" });

  const budget = await prisma.budget.create({
    data: { userId, categoryId, limitAmount, month, year },
  });
  res.status(201).json(budget);
});

router.put(
  "/:id",
  requireCsrf,
  validate(idParamSchema, "params"),
  validate(updateBudgetSchema),
  async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params as any;
    const { limitAmount } = req.body as any;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Budget not found" });

    const updated = await prisma.budget.update({ where: { id }, data: { limitAmount } });
    res.json(updated);
  }
);

router.delete("/:id", requireCsrf, validate(idParamSchema, "params"), async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params as any;

  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: "Budget not found" });

  await prisma.budget.delete({ where: { id } });
  res.json({ success: true });
});

export default router;
