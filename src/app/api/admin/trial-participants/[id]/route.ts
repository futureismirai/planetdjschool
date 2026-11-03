import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildTrialCancellationEmail } from "@/lib/emailTemplates";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notify = request.nextUrl.searchParams.get("notify") !== "false";

  let deleted;
  try {
    deleted = await prisma.trialParticipant.delete({ where: { id }, include: { trialSession: true } });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }

  console.log(
    `[trial-participant] deleted id=${deleted.id} trialSessionId=${deleted.trialSessionId} email=${deleted.studentEmail} name=${deleted.studentName} by=${admin.email}`
  );

  if (notify && deleted.studentEmail) {
    try {
      // 今後の体験会のうち、満員でないもの(今回キャンセルした回を除く)を案内する。
      const upcomingTrialSessions = await prisma.trialSession.findMany({
        where: {
          datetime: { gte: new Date() },
          id: { not: deleted.trialSessionId },
        },
        orderBy: { datetime: "asc" },
        include: { participants: true },
      });
      const availableSessions = upcomingTrialSessions
        .filter((s) => s.participants.length < s.maxSlots)
        .slice(0, 5)
        .map((s) => s.datetime);

      const { subject, text, html } = buildTrialCancellationEmail({
        studentName: deleted.studentName,
        datetime: deleted.trialSession.datetime,
        instructorName: deleted.trialSession.instructorName,
        location: deleted.trialSession.location,
        availableSessions,
      });
      await sendMail({ to: deleted.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("キャンセル通知メールの送信に失敗しました:", mailError);
    }
  }

  return NextResponse.json({ ok: true });
}
