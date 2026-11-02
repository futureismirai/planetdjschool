import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildIndividualLessonCancellationEmail } from "@/lib/emailTemplates";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let deleted;
  try {
    deleted = await prisma.individualParticipant.delete({
      where: { id },
      include: { individualLesson: true },
    });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }

  if (deleted.studentEmail) {
    try {
      const { subject, text, html } = buildIndividualLessonCancellationEmail({
        studentName: deleted.studentName,
        lessonName: deleted.individualLesson.name,
        datetime: deleted.individualLesson.datetime,
        instructorName: deleted.individualLesson.instructorName,
        location: deleted.individualLesson.location,
      });
      await sendMail({ to: deleted.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("キャンセル通知メールの送信に失敗しました:", mailError);
    }
  }

  return NextResponse.json({ ok: true });
}
