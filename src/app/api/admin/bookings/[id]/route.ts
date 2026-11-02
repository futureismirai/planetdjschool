import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildBookingCancellationEmail } from "@/lib/emailTemplates";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let deleted;
  try {
    deleted = await prisma.booking.delete({ where: { id }, include: { lesson: true } });
  } catch {
    return NextResponse.json({ error: "予約が見つかりません。" }, { status: 404 });
  }

  if (deleted.studentEmail) {
    try {
      const { subject, text, html } = buildBookingCancellationEmail({
        studentName: deleted.studentName,
        lessonName: deleted.lesson.name,
        datetime: deleted.lesson.datetime,
        instructorName: deleted.lesson.instructorName,
        location: deleted.lesson.location,
      });
      await sendMail({ to: deleted.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("キャンセル通知メールの送信に失敗しました:", mailError);
    }
  }

  return NextResponse.json({ ok: true });
}
