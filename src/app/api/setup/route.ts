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
    "studentEmail" TEXT,
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
  // 管理者が手動で予約を追加できるよう、既存DBのstudentEmailをNULL許可に変更(既にNULL許可なら何もしない)
  `ALTER TABLE "Booking" ALTER COLUMN "studentEmail" DROP NOT NULL`,
  // 体験会(管理者専用の参加者管理)
  `CREATE TABLE IF NOT EXISTS "TrialSession" (
    "id" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "instructorName" TEXT NOT NULL,
    "maxSlots" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrialSession_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "TrialParticipant" (
    "id" TEXT NOT NULL,
    "trialSessionId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "note" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrialParticipant_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "TrialSession_datetime_idx" ON "TrialSession"("datetime")`,
  `CREATE INDEX IF NOT EXISTS "TrialParticipant_trialSessionId_idx" ON "TrialParticipant"("trialSessionId")`,
  `DO $$ BEGIN
    ALTER TABLE "TrialParticipant" ADD CONSTRAINT "TrialParticipant_trialSessionId_fkey"
      FOREIGN KEY ("trialSessionId") REFERENCES "TrialSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
