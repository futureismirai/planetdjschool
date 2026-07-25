import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildIndividualLessonConfirmationEmail } from "@/lib/emailTemplates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PARTICIPANTS = 1;

class IndividualLessonNotFoundError extends Error {}
class IndividualLessonFullError extends Error {}

/**
 * 個別レッスンの生徒を管理者が手動登録するためのAPI。
 * 1回あたり1名まで(個別レッスンの定義上、固定)。生徒名・メールアドレスは必須、備考は任意。
 * 登録時に確認メールを送信する(開催3日前のリマインドはcronで別途送信)。
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

  const { individualLessonId, studentName, studentEmail, note } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof individualLessonId !== "string" ||
    !individualLessonId ||
    typeof studentName !== "string" ||
    !studentName.trim()
  ) {
    return NextResponse.json({ error: "生徒名を入力してください。" }, { status: 400 });
  }

  if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "備考の形式が正しくありません。" }, { status: 400 });
  }

  try {
    const { participant, individualLesson } = await prisma.$transaction(async (tx) => {
      const individualLesson = await tx.individualLesson.findUnique({
        where: { id: individualLessonId },
      });
      if (!individualLesson) {
        throw new IndividualLessonNotFoundError();
      }

      const registeredCount = await tx.individualParticipant.count({
        where: { individualLessonId },
      });
      if (registeredCount >= MAX_PARTICIPANTS) {
        throw new IndividualLessonFullError();
      }

      const participant = await tx.individualParticipant.create({
        data: {
          individualLessonId,
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          note: typeof note === "string" && note.trim() ? note.trim() : null,
        },
      });

      return { participant, individualLesson };
    });

    try {
      const { subject, text, html } = buildIndividualLessonConfirmationEmail({
        lessonName: individualLesson.name,
        datetime: individualLesson.datetime,
        instructorName: individualLesson.instructorName,
        location: individualLesson.location,
        studentName: participant.studentName,
      });
      await sendMail({ to: participant.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("個別レッスン確認メールの送信に失敗しました:", mailError);
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    if (error instanceof IndividualLessonNotFoundError) {
      return NextResponse.json({ error: "個別レッスンが見つかりません。" }, { status: 404 });
    }
    if (error instanceof IndividualLessonFullError) {
      return NextResponse.json(
        { error: "この個別レッスンは既に1名登録されています。" },
        { status: 409 }
      );
    }
    console.error("個別レッスン参加者の登録で予期しないエラーが発生しました:", error);
    return NextResponse.json({ error: "登録に失敗しました。" }, { status: 500 });
  }
}
