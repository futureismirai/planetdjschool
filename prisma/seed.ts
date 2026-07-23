import { PrismaClient } from "@prisma/client";
import { runInitialSeed } from "../src/lib/seedData";

const prisma = new PrismaClient();

async function main() {
  const { adminEmail } = await runInitialSeed(prisma);
  console.log(`管理者アカウントを作成/確認しました: ${adminEmail}`);
  console.log("サンプルレッスンを確認/作成しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
