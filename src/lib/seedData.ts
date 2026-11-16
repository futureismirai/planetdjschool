import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { INSTRUCTOR_NAME_OPTIONS } from "./constants";

/**
 * 初期管理者アカウントとサンプルレッスンを投入する。
 * 既に存在する場合は上書き・重複作成しない(何度呼び出しても安全)。
 */
export async function runInitialSeed(prisma: PrismaClient) {
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? "changeme123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash },
  });

  // これまで選択肢として固定で用意していた講師名を、講師一覧テーブルに登録する
  // (既に登録済みの名前はそのまま、新規の名前だけ追加する)。
  // 「未定」は講師ではないため、講師一覧テーブルには登録しない。
  for (const name of INSTRUCTOR_NAME_OPTIONS) {
    if (name === "未定") continue;
    await prisma.instructor.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const existingLessons = await prisma.lesson.count();
  if (existingLessons === 0) {
    const now = new Date();
    const daysFromNow = (days: number, hour: number, minute = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    // 実際のスケジュール表と同様、同じ日に複数コマが並ぶケースを含めている
    await prisma.lesson.createMany({
      data: [
        { name: "Lesson1", datetime: daysFromNow(3, 13, 0), instructorName: "DJ TARO", maxSlots: 3 },
        { name: "Lesson2", datetime: daysFromNow(3, 14, 30), instructorName: "DJ TARO", maxSlots: 3 },
        { name: "Lesson3", datetime: daysFromNow(7, 18, 0), instructorName: "DJ HANA", maxSlots: 3 },
        { name: "Lesson1", datetime: daysFromNow(10, 13, 0), instructorName: "DJ KEN", maxSlots: 3 },
        { name: "Lesson2", datetime: daysFromNow(10, 14, 30), instructorName: "DJ KEN", maxSlots: 3 },
        { name: "Lesson5", datetime: daysFromNow(14, 19, 0), instructorName: "DJ HANA", maxSlots: 3 },
      ],
    });
  }

  return { adminEmail };
}
