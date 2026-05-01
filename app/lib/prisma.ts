import { PrismaClient } from "@prisma/client";

// Avoid a global singleton in development so schema updates are reflected
// immediately by a fresh Prisma client during local iteration.
const prisma = new PrismaClient();

export default prisma;
