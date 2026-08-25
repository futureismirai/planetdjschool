import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildTrialThankYouEmail } from "@/lib/emailTemplates";

/**
 * 体験会受講後のお礼メールを送信するAPI。管理者が編集画面で入力した本文をそのまま送信する。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { text } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "本文を入力してください。" }, { status: 400 });
  }

  const participant = await prisma.trialParticipant.findUnique({
    where: { id },
    include: { trialSession: true },
  });
  if (!participant) {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }
  if (participant.thankYouEmailSentAt) {
    return NextResponse.json({ error: "お礼メールは既に送信済みです。" }, { status: 409 });
  }
  if (participant.trialSession.datetime > new Date()) {
    return NextResponse.json(
      { error: "この体験会はまだ終了していないため、お礼メールは送信できません。" },
      { status: 409 }
    );
  }

  try {
    const { subject, text: mailText, html } = buildTrialThankYouEmail(text);
    await sendMail({ to: participant.studentEmail, subject, text: mailText, html });
  } catch (mailError) {
    console.error("体験会お礼メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  await prisma.trialParticipant.update({
    where: { id },
    data: { thankYouEmailSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
