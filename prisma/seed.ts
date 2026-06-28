import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Housing", icon: "home", colour: "#6366F1" },
  { name: "Food & dining", icon: "tools-kitchen-2", colour: "#F59E0B" },
  { name: "Transport", icon: "car", colour: "#10B981" },
  { name: "Shopping", icon: "shopping-bag", colour: "#EC4899" },
  { name: "Subscriptions", icon: "device-tv", colour: "#8B5CF6" },
  { name: "Health", icon: "heart-rate-monitor", colour: "#EF4444" },
  { name: "Education", icon: "book", colour: "#0EA5E9" },
  { name: "Investments", icon: "chart-line", colour: "#14B8A6" },
  { name: "Utilities", icon: "bolt", colour: "#F97316" },
  { name: "Entertainment", icon: "confetti", colour: "#A855F7" },
  { name: "Income", icon: "building-bank", colour: "#22C55E" },
  { name: "Other", icon: "dots-circle-horizontal", colour: "#9CA3AF" },
];

async function main() {
  let created = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, name: cat.name },
    });
    if (existing) continue;
    await prisma.category.create({
      data: { ...cat, userId: null, isSystem: true },
    });
    created++;
  }
  console.log(`Seed complete. Created ${created} new system categories (${DEFAULT_CATEGORIES.length - created} already existed).`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
