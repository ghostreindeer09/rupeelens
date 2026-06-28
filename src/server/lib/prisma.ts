// src/server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Singleton pattern — avoids exhausting DB connections from repeated
// instantiation, especially under tsx watch's module reloading.
export const prisma = new PrismaClient();
