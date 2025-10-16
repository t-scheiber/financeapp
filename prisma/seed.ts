import { prisma } from "../lib/db";

async function main() {
  console.log("Database initialized - no default companies seeded.");
  console.log("Users can now add companies through the web interface.");
  console.log("Database ready for user-generated content!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
