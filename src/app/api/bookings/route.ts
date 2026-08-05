import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { buildBookingConfirmationEmail } from "@/lib/emailTemplates";
import { DEFAULT_LOCATION } from "@/lib/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class LessonNotFoundError extends Error {}
class LessonFullError extends Error {}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { lessonId, studentName, studentEmail, studentPhone } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof lessonId !== "string" ||
    !lessonId ||
    typeof studentName !== "string" ||
    !studentName.trim() ||
    typeof studentEmail !== "string" ||
    !EMAIL_RE.test(studentEmail.trim())
  ) {
    return NextResponse.json(
      { error: "氏名・メールアドレスを正しく入力してください。" },
      { status: 400 }
    );
  }

  if (studentPhone !== undefined && studentPhone !== null && typeof studentPhone !== "string") {
    return NextResponse.json({ error: "電話番号の形式が正しくありません。" }, { status: 400 });
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
          studentPhone: studentPhone?.trim() || null,
        },
      });

      return { booking, lesson };
    });

    try {
      const { subject, text, html } = buildBookingConfirmationEmail({
        lessonName: lesson.name,
        datetime: lesson.datetime,
        instructorName: lesson.instructorName,
        location: lesson.location ?? DEFAULT_LOCATION,
        studentName: booking.studentName,
      });
      await sendMail({ to: studentEmail.trim(), subject, text, html });
    } catch (mailError) {
      console.error("予約完了メールの送信に失敗しました:", mailError);
    }

    return NextResponse.json({ bookingId: booking.id }, { status: 201 });
  } catch (error) {
    if (error instanceof LessonNotFoundError) {
      return NextResponse.json({ error: "レッスンが見つかりません。" }, { status: 404 });
    }
    if (error instanceof LessonFullError) {
      return NextResponse.json(
        { error: "申し訳ございません。ちょうど満席になってしまいました。" },
        { status: 409 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("予約処理でDBエラーが発生しました:", error);
      return NextResponse.json({ error: "予約処理に失敗しました。" }, { status: 500 });
    }
    console.error("予約処理で予期しないエラーが発生しました:", error);
    return NextResponse.json({ error: "予約処理に失敗しました。" }, { status: 500 });
  }
}
