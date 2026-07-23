import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runInitialSeed } from "@/lib/seedData";

/**
 * 初回デプロイ時にテーブル作成・初期データ投入を行うための、1回限りの初期化エンドポイント。
 * CRON_SECRET で保護されており、何度呼び出しても安全(冪等)。
 */

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS "Lesson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "instructorName" TEXT NOT NULL,
    "maxSlots" INTEGER NOT NULL DEFAULT 3,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentPhone" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "Lesson_datetime_idx" ON "Lesson"("datetime")`,
  `CREATE INDEX IF NOT EXISTS "Booking_lessonId_idx" ON "Booking"("lessonId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email")`,
  `DO $$ BEGIN
    ALTER TABLE "Booking" ADD CONSTRAINT "Booking_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  for (const sql of CREATE_TABLES_SQL) {
    await prisma.$executeRawUnsafe(sql);
  }

  const { adminEmail } = await runInitialSeed(prisma);

  return NextResponse.json({
    ok: true,
    message: `セットアップが完了しました。管理者アカウント: ${adminEmail}`,
  });
}
