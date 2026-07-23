import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { buildReminderEmail } from "@/lib/emailTemplates";
import { getJstDayWindow } from "@/lib/date";

const REMINDER_DAYS_BEFORE = 3;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const secretParam = request.nextUrl.searchParams.get("secret");
  return secretParam === cronSecret;
}

async function runReminderBatch() {
  const { start, end } = getJstDayWindow(REMINDER_DAYS_BEFORE);

  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: start, lt: end } },
    include: {
      bookings: { where: { reminderSentAt: null } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const lesson of lessons) {
    for (const booking of lesson.bookings) {
      try {
        const { subject, text, html } = buildReminderEmail({
          lessonName: lesson.name,
          datetime: lesson.datetime,
          instructorName: lesson.instructorName,
          location: lesson.location,
          studentName: booking.studentName,
        });
        await sendMail({ to: booking.studentEmail, subject, text, html });
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(`リマインドメール送信に失敗しました (bookingId=${booking.id}):`, error);
        failed += 1;
      }
    }
  }

  return { targetLessons: lessons.length, sent, failed };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderBatch();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
