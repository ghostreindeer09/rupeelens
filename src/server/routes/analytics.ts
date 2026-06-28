// src/server/routes/analytics.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { analyticsQuerySchema, trendQuerySchema } from "../lib/schemas.js";

const router = Router();

function monthRange(month: number, year: number) {
  return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
}

router.get("/summary", validate(analyticsQuerySchema, "query"), async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const month = (req.query as any).month ?? now.getMonth() + 1;
  const year = (req.query as any).year ?? now.getFullYear();

  const where = { userId, deletedAt: null, date: monthRange(month, year) };

  const [income, spend, count] = await Promise.all([
    prisma.transaction.aggregate({ where: { ...where, type: "CREDIT" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, type: "DEBIT" }, _sum: { amount: true } }),
    prisma.transaction.count({ where }),
  ]);

  const incomeTotal = Number(income._sum.amount ?? 0);
  const spendTotal = Number(spend._sum.amount ?? 0);

  res.json({
    month,
    year,
    income: incomeTotal,
    spend: spendTotal,
    savings: incomeTotal - spendTotal,
    transactionCount: count,
  });
});

router.get("/by-category", validate(analyticsQuerySchema, "query"), async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const month = (req.query as any).month ?? now.getMonth() + 1;
  const year = (req.query as any).year ?? now.getFullYear();

  interface GroupRow {
    categoryId: string | null;
    _sum: { amount: unknown };
    _count: number;
  }

  const rows: GroupRow[] = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, deletedAt: null, type: "DEBIT", date: monthRange(month, year) },
    _sum: { amount: true },
    _count: true,
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: rows.map((r: GroupRow) => r.categoryId).filter((id): id is string => !!id) } },
  });

  const result = rows.map((r: GroupRow) => {
    const cat = categories.find((c: { id: string; name: string; colour: string; icon: string }) => c.id === r.categoryId);
    return {
      categoryId: r.categoryId,
      categoryName: cat?.name ?? "Uncategorised",
      colour: cat?.colour ?? "#9CA3AF",
      icon: cat?.icon ?? "dots-circle-horizontal",
      total: Number(r._sum.amount ?? 0),
      count: r._count,
    };
  });

  res.json(result.sort((a: { total: number }, b: { total: number }) => b.total - a.total));
});

router.get("/trend", validate(trendQuerySchema, "query"), async (req, res) => {
  const userId = req.userId!;
  const { months } = req.query as any;

  const now = new Date();
  const results: { month: number; year: number; income: number; spend: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const where = { userId, deletedAt: null, date: monthRange(month, year) };

    const [income, spend] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, type: "CREDIT" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, type: "DEBIT" }, _sum: { amount: true } }),
    ]);

    results.push({
      month,
      year,
      income: Number(income._sum.amount ?? 0),
      spend: Number(spend._sum.amount ?? 0),
    });
  }

  res.json(results);
});

export default router;
