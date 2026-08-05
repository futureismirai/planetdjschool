import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import {
  buildIndividualLessonReminderEmail,
  buildReminderEmail,
  buildTrialReminderEmail,
} from "@/lib/emailTemplates";
import { getJstDayWindow } from "@/lib/date";
import { DEFAULT_LOCATION } from "@/lib/constants";

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
      bookings: { where: { reminderSentAt: null, studentEmail: { not: null } } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const lesson of lessons) {
    for (const booking of lesson.bookings) {
      if (!booking.studentEmail) continue;
      try {
        const { subject, text, html } = buildReminderEmail({
          lessonName: lesson.name,
          datetime: lesson.datetime,
          instructorName: lesson.instructorName,
          location: lesson.location ?? DEFAULT_LOCATION,
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

async function runTrialReminderBatch() {
  const { start, end } = getJstDayWindow(REMINDER_DAYS_BEFORE);

  const trialSessions = await prisma.trialSession.findMany({
    where: { datetime: { gte: start, lt: end } },
    include: {
      participants: { where: { reminderSentAt: null } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const trialSession of trialSessions) {
    for (const participant of trialSession.participants) {
      try {
        const { subject, text, html } = buildTrialReminderEmail({
          datetime: trialSession.datetime,
          instructorName: trialSession.instructorName,
          location: trialSession.location ?? DEFAULT_LOCATION,
          studentName: participant.studentName,
        });
        await sendMail({ to: participant.studentEmail, subject, text, html });
        await prisma.trialParticipant.update({
          where: { id: participant.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(`体験会リマインドメール送信に失敗しました (participantId=${participant.id}):`, error);
        failed += 1;
      }
    }
  }

  return { targetTrialSessions: trialSessions.length, sent, failed };
}

async function runIndividualLessonReminderBatch() {
  const { start, end } = getJstDayWindow(REMINDER_DAYS_BEFORE);

  const individualLessons = await prisma.individualLesson.findMany({
    where: { datetime: { gte: start, lt: end } },
    include: {
      participants: { where: { reminderSentAt: null } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const individualLesson of individualLessons) {
    for (const participant of individualLesson.participants) {
      try {
        const { subject, text, html } = buildIndividualLessonReminderEmail({
          lessonName: individualLesson.name,
          datetime: individualLesson.datetime,
          instructorName: individualLesson.instructorName,
          location: individualLesson.location ?? DEFAULT_LOCATION,
          studentName: participant.studentName,
        });
        await sendMail({ to: participant.studentEmail, subject, text, html });
        await prisma.individualParticipant.update({
          where: { id: participant.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(`個別レッスンリマインドメール送信に失敗しました (participantId=${participant.id}):`, error);
        failed += 1;
      }
    }
  }

  return { targetIndividualLessons: individualLessons.length, sent, failed };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [lessonResult, trialResult, individualResult] = await Promise.all([
    runReminderBatch(),
    runTrialReminderBatch(),
    runIndividualLessonReminderBatch(),
  ]);
  return NextResponse.json({
    lessons: lessonResult,
    trialSessions: trialResult,
    individualLessons: individualResult,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
