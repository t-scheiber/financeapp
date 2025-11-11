import { PrismaClient } from "./generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DATABASE_URL environment variable directly
const databaseUrl = process.env.DATABASE_URL;

// Only throw error at runtime, not during build
// During build, we might not have DATABASE_URL, so we'll handle it gracefully
let prismaClient: PrismaClient;

if (!databaseUrl) {
  // Build time or missing env - create a client that will error if actually used
  // This allows the build to complete without DATABASE_URL
  prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: "mysql://dummy:dummy@localhost:3306/dummy",
      },
    },
  });
} else {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query"] : [],
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
