import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

let prismaClient: PrismaClient;

if (!databaseUrl) {
  // Build time or missing env - dummy URL so build completes; will fail if used at runtime
  prismaClient = new PrismaClient({
    datasourceUrl: "mysql://dummy:dummy@localhost:3306/dummy",
  });
} else {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query"] : [],
      datasourceUrl: databaseUrl,
    });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
