import { prisma } from "../lib/db";

async function main() {
  return;
}

main()
  .catch(() => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
