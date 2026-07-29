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
    "note" TEXT,
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
  // 既存DBに備考欄を追加(グループレッスンの予約にも体験会・個別レッスンと同様の備考欄を持たせる)
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "note" TEXT`,
  // 体験会(管理者専用の参加者管理)
  `CREATE TABLE IF NOT EXISTS "TrialSession" (
    "id" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "instructorName" TEXT NOT NULL,
    "maxSlots" INTEGER NOT NULL DEFAULT 3,
    "location" TEXT,
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
  // 個別レッスン(管理者専用、1回1名まで)
  `CREATE TABLE IF NOT EXISTS "IndividualLesson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "instructorName" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndividualLesson_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "IndividualParticipant" (
    "id" TEXT NOT NULL,
    "individualLessonId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "note" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IndividualParticipant_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "IndividualLesson_datetime_idx" ON "IndividualLesson"("datetime")`,
  `CREATE INDEX IF NOT EXISTS "IndividualParticipant_individualLessonId_idx" ON "IndividualParticipant"("individualLessonId")`,
  `DO $$ BEGIN
    ALTER TABLE "IndividualParticipant" ADD CONSTRAINT "IndividualParticipant_individualLessonId_fkey"
      FOREIGN KEY ("individualLessonId") REFERENCES "IndividualLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  // 既存DBに場所欄を追加(体験会・個別レッスンにもグループレッスンと同様の場所欄を持たせる)
  `ALTER TABLE "TrialSession" ADD COLUMN IF NOT EXISTS "location" TEXT`,
  `ALTER TABLE "IndividualLesson" ADD COLUMN IF NOT EXISTS "location" TEXT`,
  // 生徒別ページで管理者が記入する進捗コメント欄(グループレッスン・個別レッスンのみ、体験会は対象外)
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "comment" TEXT`,
  `ALTER TABLE "IndividualParticipant" ADD COLUMN IF NOT EXISTS "comment" TEXT`,
  // 生徒一覧をコメント更新順に並べ替えるためのタイムスタンプ
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "commentUpdatedAt" TIMESTAMP(3)`,
  `ALTER TABLE "IndividualParticipant" ADD COLUMN IF NOT EXISTS "commentUpdatedAt" TIMESTAMP(3)`,
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
