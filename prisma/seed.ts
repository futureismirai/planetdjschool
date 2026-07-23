import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? "changeme123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash },
  });
  console.log(`管理者アカウントを作成/確認しました: ${adminEmail}`);

  const existingLessons = await prisma.lesson.count();
  if (existingLessons === 0) {
    const now = new Date();
    const daysFromNow = (days: number, hour: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    await prisma.lesson.createMany({
      data: [
        {
          name: "Lesson1",
          datetime: daysFromNow(3, 19),
          instructorName: "DJ TARO",
          maxSlots: 3,
          location: "Planet DJ School 渋谷校",
        },
        {
          name: "Lesson2",
          datetime: daysFromNow(5, 20),
          instructorName: "DJ HANA",
          maxSlots: 3,
          location: "Planet DJ School 渋谷校",
        },
        {
          name: "Lesson3",
          datetime: daysFromNow(7, 18),
          instructorName: "DJ TARO",
          maxSlots: 3,
          location: "Planet DJ School 新宿校",
        },
        {
          name: "Lesson4",
          datetime: daysFromNow(10, 19),
          instructorName: "DJ KEN",
          maxSlots: 3,
          location: "Planet DJ School 渋谷校",
        },
        {
          name: "Lesson5",
          datetime: daysFromNow(14, 20),
          instructorName: "DJ HANA",
          maxSlots: 3,
          location: "Planet DJ School 新宿校",
        },
      ],
    });
    console.log("サンプルレッスンを作成しました。");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
