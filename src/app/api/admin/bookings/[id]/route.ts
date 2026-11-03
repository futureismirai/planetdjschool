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
      // 同じレッスン名の今後の日程のうち、満員でないもの(今回キャンセルした回を除く)を案内する。
      const upcomingLessons = await prisma.lesson.findMany({
        where: {
          name: deleted.lesson.name,
          datetime: { gte: new Date() },
          id: { not: deleted.lessonId },
        },
        orderBy: { datetime: "asc" },
        include: { bookings: true },
      });
      const availableSessions = upcomingLessons
        .filter((l) => l.bookings.length < l.maxSlots)
        .slice(0, 5)
        .map((l) => l.datetime);

      const { subject, text, html } = buildBookingCancellationEmail({
        studentName: deleted.studentName,
        lessonName: deleted.lesson.name,
        datetime: deleted.lesson.datetime,
        instructorName: deleted.lesson.instructorName,
        location: deleted.lesson.location,
        availableSessions,
      });
      await sendMail({ to: deleted.studentEmail, subject, text, html });
    } catch (mailError) {
      console.error("キャンセル通知メールの送信に失敗しました:", mailError);
    }
  }

  return NextResponse.json({ ok: true });
}
