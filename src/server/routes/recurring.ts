// src/server/routes/recurring.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { requireCsrf } from "../middleware/csrf.js";
import { createRecurringSchema, updateRecurringSchema, idParamSchema } from "../lib/schemas.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.userId!;
  const items = await prisma.recurringItem.findMany({
    where: { userId },
    orderBy: { dayOfMonth: "asc" },
  });
  res.json(items);
});

router.post("/", requireCsrf, validate(createRecurringSchema), async (req, res) => {
  const userId = req.userId!;
  const item = await prisma.recurringItem.create({
    data: { userId, ...(req.body as any) },
  });
  res.status(201).json(item);
});

router.put(
  "/:id",
  requireCsrf,
  validate(idParamSchema, "params"),
  validate(updateRecurringSchema),
  async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params as any;

    const existing = await prisma.recurringItem.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Recurring item not found" });

    const updated = await prisma.recurringItem.update({ where: { id }, data: req.body as any });
    res.json(updated);
  }
);

router.delete("/:id", requireCsrf, validate(idParamSchema, "params"), async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params as any;

  const existing = await prisma.recurringItem.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: "Recurring item not found" });

  await prisma.recurringItem.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true });
});

export default router;
