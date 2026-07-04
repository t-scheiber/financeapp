import { PrismaClient } from "./generated/prisma";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build time or missing env - dummy URL so build completes; will fail if used at runtime
const databaseUrl =
  process.env.DATABASE_URL || "mysql://dummy:dummy@localhost:3306/dummy";

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    adapter: new PrismaMariaDb(databaseUrl),
  });

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
