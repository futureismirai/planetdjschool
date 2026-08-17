import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildNextLessonInviteEmail } from "@/lib/emailTemplates";

// このレッスンを終了した生徒に、どのレッスンの受講を勧めるかの対応表。
const NEXT_LESSON_NAME: Record<string, string> = {
  "Lesson 1": "Lesson 2",
  "Lesson 2": "Lesson 3",
};

/**
 * グループレッスンを終了した生徒へ、次のレッスンの受講を促す案内メールを送信するAPI。
 * 管理者が「グループレッスン」画面のボタンから手動で呼び出す(自動送信ではない)。
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { lesson: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "予約が見つかりません。" }, { status: 404 });
  }
  if (!booking.studentEmail) {
    return NextResponse.json({ error: "この予約にはメールアドレスが登録されていません。" }, { status: 400 });
  }

  const nextLessonName = NEXT_LESSON_NAME[booking.lesson.name];
  if (!nextLessonName) {
    return NextResponse.json(
      { error: `「${booking.lesson.name}」の受講者には送信できません。` },
      { status: 400 }
    );
  }

  const nextLesson = await prisma.lesson.findFirst({
    where: { name: nextLessonName, datetime: { gte: new Date() } },
    orderBy: { datetime: "asc" },
    include: { bookings: true },
  });
  if (!nextLesson) {
    return NextResponse.json(
      { error: `${nextLessonName}の今後の開催日程がまだ登録されていません。先にレッスンを登録してください。` },
      { status: 404 }
    );
  }

  const alreadyBookedNextLesson = await prisma.booking.findFirst({
    where: {
      studentEmail: { equals: booking.studentEmail, mode: "insensitive" },
      lesson: { name: nextLessonName },
    },
  });
  if (alreadyBookedNextLesson) {
    return NextResponse.json(
      { error: `この生徒はすでに${nextLessonName}に登録済みです。` },
      { status: 409 }
    );
  }

  try {
    const { subject, text, html } = buildNextLessonInviteEmail({
      studentName: booking.studentName,
      currentLessonName: booking.lesson.name,
      nextLessonName: nextLesson.name,
      nextLessonDatetime: nextLesson.datetime,
      nextLessonHasNoBookings: nextLesson.bookings.length === 0,
    });
    await sendMail({ to: booking.studentEmail, subject, text, html });
  } catch (mailError) {
    console.error("次のレッスン案内メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { nextLessonEmailSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
