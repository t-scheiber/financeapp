// Applies the Prisma migrations to the demo database, the SQLite file the
// demo account reads (see lib/db.ts). Runs "prisma migrate deploy" with
// DATABASE_URL pointed at DEMO_DATABASE_URL (default file:./data/demo.db).
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const demoDatabaseUrl =
  process.env.DEMO_DATABASE_URL || "file:./data/demo.db";

console.log(`Applying migrations to the demo database (${demoDatabaseUrl})`);
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: demoDatabaseUrl },
});
process.exit(result.status ?? 1);
