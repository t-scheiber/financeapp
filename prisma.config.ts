import "dotenv/config";
import { defineConfig } from "prisma/config";

// prisma generate does not connect to the DB; a placeholder URL is enough at install/build time.
const databaseUrl =
  process.env.DATABASE_URL ?? "file:./data/finance.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
