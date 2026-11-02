import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildTrialCancellationEmail } from "@/lib/emailTemplates";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let deleted;
  try {
    deleted = await prisma.trialParticipant.delete({ where: { id }, include: { trialSession: true } });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }

  console.log(
    `[trial-participant] deleted id=${deleted.id} trialSessionId=${deleted.trialSessionId} email=${deleted.studentEmail} name=${deleted.studentName} by=${admin.email}`
  );

  if (deleted.studentEmail) {
    try {
      const { subject, text, html } = buildTrialCancellationEmail({
        studentName: deleted.studentName,
        datetime: deleted.trialSession.datetime,
        instructorName: deleted.trialSession.instructorName,
        location: deleted.trialSession.location,
      });
      await sendMail({ to: deleted.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("キャンセル通知メールの送信に失敗しました:", mailError);
    }
  }

  return NextResponse.json({ ok: true });
}
