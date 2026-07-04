import { PrismaClient } from "./generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const defaultDatabaseUrl = "file:./data/finance.db";

// Build time or missing env - placeholder path so generate/build completes
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
