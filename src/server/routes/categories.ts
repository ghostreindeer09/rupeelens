// src/server/routes/categories.ts
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.js";
import { requireCsrf } from "../middleware/csrf.js";
import { createCategorySchema, updateCategorySchema, idParamSchema } from "../lib/schemas.js";

const router = Router();

router.get("/", async (req, res) => {
  const userId = req.userId!;
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

router.post("/", requireCsrf, validate(createCategorySchema), async (req, res) => {
  const userId = req.userId!;
  const { name, icon, colour } = req.body as any;

  const existing = await prisma.category.findFirst({ where: { userId, name } });
  if (existing) return res.status(409).json({ error: "Category with this name already exists" });

  const category = await prisma.category.create({
    data: { userId, name, icon, colour, isSystem: false },
  });
  res.status(201).json(category);
});

router.put(
  "/:id",
  requireCsrf,
  validate(idParamSchema, "params"),
  validate(updateCategorySchema),
  async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params as any;

    const existing = await prisma.category.findFirst({ where: { id, userId, isSystem: false } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found or cannot be modified" });
    }

    const updated = await prisma.category.update({ where: { id }, data: req.body as any });
    res.json(updated);
  }
);

router.delete("/:id", requireCsrf, validate(idParamSchema, "params"), async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params as any;

  const existing = await prisma.category.findFirst({ where: { id, userId, isSystem: false } });
  if (!existing) {
    return res.status(404).json({ error: "Category not found or cannot be deleted" });
  }

  const otherCategory = await prisma.category.findFirst({
    where: { userId: null, name: "Other" },
  });

  await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: otherCategory?.id ?? null },
    }),
    prisma.category.delete({ where: { id } }),
  ]);

  res.json({ success: true });
});

export default router;
