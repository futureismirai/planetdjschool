import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildBookingConfirmationEmail } from "@/lib/emailTemplates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class LessonNotFoundError extends Error {}
class LessonFullError extends Error {}

/**
 * 管理者が電話・対面などで受け付けた予約を手動で登録するためのAPI。
 * 生徒名・メールアドレスは必須、電話番号・備考は任意。
 * 登録時に確認メールを送信する(3日前リマインドも自動的に対象となる)。
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

  const { lessonId, studentName, studentEmail, studentPhone, note } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof lessonId !== "string" || !lessonId || typeof studentName !== "string" || !studentName.trim()) {
    return NextResponse.json({ error: "生徒名を入力してください。" }, { status: 400 });
  }

  if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  if (studentPhone !== undefined && studentPhone !== null && typeof studentPhone !== "string") {
    return NextResponse.json({ error: "電話番号の形式が正しくありません。" }, { status: 400 });
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "備考の形式が正しくありません。" }, { status: 400 });
  }

  try {
    const { booking, lesson } = await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) {
        throw new LessonNotFoundError();
      }

      const bookedCount = await tx.booking.count({ where: { lessonId } });
      if (bookedCount >= lesson.maxSlots) {
        throw new LessonFullError();
      }

      const booking = await tx.booking.create({
        data: {
          lessonId,
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          studentPhone: typeof studentPhone === "string" && studentPhone.trim() ? studentPhone.trim() : null,
          note: typeof note === "string" && note.trim() ? note.trim() : null,
        },
      });

      return { booking, lesson };
    });

    try {
      const { subject, text, html } = buildBookingConfirmationEmail({
        lessonName: lesson.name,
        datetime: lesson.datetime,
        instructorName: lesson.instructorName,
        location: lesson.location,
        studentName: booking.studentName,
      });
      await sendMail({ to: studentEmail.trim(), subject, text, html });
    } catch (mailError) {
      console.error("手動予約の確認メール送信に失敗しました:", mailError);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof LessonNotFoundError) {
      return NextResponse.json({ error: "レッスンが見つかりません。" }, { status: 404 });
    }
    if (error instanceof LessonFullError) {
      return NextResponse.json({ error: "このレッスンは満席です。" }, { status: 409 });
    }
    console.error("手動予約の登録で予期しないエラーが発生しました:", error);
    return NextResponse.json({ error: "登録に失敗しました。" }, { status: 500 });
  }
}
