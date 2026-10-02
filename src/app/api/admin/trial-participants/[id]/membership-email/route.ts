import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildMembershipInvoiceEmail } from "@/lib/emailTemplates";
import { formatDateOnly } from "@/lib/date";

const PAYMENT_DEADLINE_DAYS = 7;

/**
 * ご入会案内(お礼とお振込み案内)メールを送信するAPI。
 * 管理者が編集画面で入力した本文(お礼・自由記載部分)の下に、プラン比較・振込先・
 * 振込期限(送信日の7日後)を自動で付与して送信する。
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
  if (participant.membershipEmailSentAt) {
    return NextResponse.json({ error: "ご入会案内メールは既に送信済みです。" }, { status: 409 });
  }
  if (participant.trialSession.datetime > new Date()) {
    return NextResponse.json(
      { error: "この体験会はまだ終了していないため、ご入会案内メールは送信できません。" },
      { status: 409 }
    );
  }

  const paymentDeadlineText = formatDateOnly(
    new Date(Date.now() + PAYMENT_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
  );

  try {
    const { subject, text: mailText, html } = buildMembershipInvoiceEmail(
      text,
      participant.trialSession.instructorName,
      paymentDeadlineText
    );
    await sendMail({ to: participant.studentEmail, subject, text: mailText, html });
  } catch (mailError) {
    console.error("ご入会案内メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  await prisma.trialParticipant.update({
    where: { id },
    data: { membershipEmailSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
