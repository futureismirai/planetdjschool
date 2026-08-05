import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildTrialConfirmationEmail } from "@/lib/emailTemplates";
import { DEFAULT_LOCATION } from "@/lib/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class TrialSessionNotFoundError extends Error {}
class TrialSessionFullError extends Error {}

/**
 * 体験会の参加者を管理者が手動登録するためのAPI。
 * 生徒名・メールアドレスは必須、備考は任意。
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

  const { trialSessionId, studentName, studentEmail, note } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof trialSessionId !== "string" || !trialSessionId || typeof studentName !== "string" || !studentName.trim()) {
    return NextResponse.json({ error: "生徒名を入力してください。" }, { status: 400 });
  }

  if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "備考の形式が正しくありません。" }, { status: 400 });
  }

  try {
    const { participant, trialSession } = await prisma.$transaction(async (tx) => {
      const trialSession = await tx.trialSession.findUnique({ where: { id: trialSessionId } });
      if (!trialSession) {
        throw new TrialSessionNotFoundError();
      }

      const registeredCount = await tx.trialParticipant.count({ where: { trialSessionId } });
      if (registeredCount >= trialSession.maxSlots) {
        throw new TrialSessionFullError();
      }

      const participant = await tx.trialParticipant.create({
        data: {
          trialSessionId,
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          note: typeof note === "string" && note.trim() ? note.trim() : null,
        },
      });

      return { participant, trialSession };
    });

    try {
      const { subject, text, html } = buildTrialConfirmationEmail({
        datetime: trialSession.datetime,
        instructorName: trialSession.instructorName,
        location: trialSession.location ?? DEFAULT_LOCATION,
        studentName: participant.studentName,
      });
      await sendMail({ to: participant.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("体験会確認メールの送信に失敗しました:", mailError);
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    if (error instanceof TrialSessionNotFoundError) {
      return NextResponse.json({ error: "体験会が見つかりません。" }, { status: 404 });
    }
    if (error instanceof TrialSessionFullError) {
      return NextResponse.json({ error: "この体験会は定員に達しています。" }, { status: 409 });
    }
    console.error("体験会参加者の登録で予期しないエラーが発生しました:", error);
    return NextResponse.json({ error: "登録に失敗しました。" }, { status: 500 });
  }
}
