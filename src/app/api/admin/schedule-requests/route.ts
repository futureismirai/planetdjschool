import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildScheduleRequestEmail } from "@/lib/emailTemplates";
import { formatDateOnly, getJstDayWindow } from "@/lib/date";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_DAYS = 14;

function bookingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://planetdjschool.vercel.app";
}

/**
 * 個別レッスンの日程調整依頼を新規作成し、生徒に候補日入力ページのリンクを送信するAPI。
 * 回答期間は送信日から14日後まで。
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { studentName, studentEmail, instructorName } = (body ?? {}) as Record<string, unknown>;

  if (typeof studentName !== "string" || !studentName.trim()) {
    return NextResponse.json({ error: "生徒名を入力してください。" }, { status: 400 });
  }
  if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }
  if (instructorName !== undefined && instructorName !== null && typeof instructorName !== "string") {
    return NextResponse.json({ error: "講師名の形式が正しくありません。" }, { status: 400 });
  }

  const now = new Date();
  const windowStart = getJstDayWindow(0, now).start;
  const windowEnd = getJstDayWindow(WINDOW_DAYS, now).end;

  const scheduleRequest = await prisma.scheduleRequest.create({
    data: {
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim(),
      instructorName: typeof instructorName === "string" && instructorName.trim() ? instructorName.trim() : null,
      windowStart,
      windowEnd,
    },
  });

  const url = `${bookingSiteUrl()}/schedule/${scheduleRequest.token}`;

  try {
    const { subject, text, html } = buildScheduleRequestEmail({
      studentName: scheduleRequest.studentName,
      instructorName: scheduleRequest.instructorName,
      windowStartText: formatDateOnly(windowStart),
      windowEndText: formatDateOnly(new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000)),
      url,
    });
    await sendMail({ to: scheduleRequest.studentEmail, subject, text, html });
  } catch (mailError) {
    console.error("日程調整依頼メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ scheduleRequest }, { status: 201 });
}
