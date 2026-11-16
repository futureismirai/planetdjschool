import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import {
  buildIndividualLessonReminderEmail,
  buildInstructorLessonReminderEmail,
  buildInstructorTrialReminderEmail,
  buildLesson3SurveyEmail,
  buildReminderEmail,
  buildTrialReminderEmail,
} from "@/lib/emailTemplates";
import { getJstDayWindow } from "@/lib/date";
import { DEFAULT_LOCATION } from "@/lib/constants";
import { getInstructorEmailByName } from "@/lib/instructors";

const REMINDER_DAYS_BEFORE = 3;
const INSTRUCTOR_REMINDER_DAYS_BEFORE = 1;

// Lesson 3受講後のアンケート依頼メールの自動送信を一時的に停止する場合はfalseにする。
// (再開する場合はtrueに戻すだけでよい。関連コードは削除していない)
const LESSON3_SURVEY_ENABLED = false;

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

/**
 * 講師向け: 開催前日にレッスンのリマインドメールを自動送信する。
 * 対象の講師にメールアドレスが登録されていない場合は送信せずスキップする。
 */
async function runInstructorLessonReminderBatch() {
  const { start, end } = getJstDayWindow(INSTRUCTOR_REMINDER_DAYS_BEFORE);

  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: start, lt: end }, instructorReminderSentAt: null },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lesson of lessons) {
    const instructorEmail = await getInstructorEmailByName(lesson.instructorName);
    if (!instructorEmail) {
      skipped += 1;
      continue;
    }
    try {
      const { subject, text, html } = buildInstructorLessonReminderEmail({
        instructorName: lesson.instructorName,
        lessonName: lesson.name,
        datetime: lesson.datetime,
        location: lesson.location ?? DEFAULT_LOCATION,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { instructorReminderSentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      console.error(`講師向けレッスンリマインドメール送信に失敗しました (lessonId=${lesson.id}):`, error);
      failed += 1;
    }
  }

  return { targetLessons: lessons.length, sent, failed, skipped };
}

/**
 * 講師向け: 開催前日に体験会のリマインドメールを自動送信する。
 * 対象の講師にメールアドレスが登録されていない場合は送信せずスキップする。
 */
async function runInstructorTrialReminderBatch() {
  const { start, end } = getJstDayWindow(INSTRUCTOR_REMINDER_DAYS_BEFORE);

  const trialSessions = await prisma.trialSession.findMany({
    where: { datetime: { gte: start, lt: end }, instructorReminderSentAt: null },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const trialSession of trialSessions) {
    const instructorEmail = await getInstructorEmailByName(trialSession.instructorName);
    if (!instructorEmail) {
      skipped += 1;
      continue;
    }
    try {
      const { subject, text, html } = buildInstructorTrialReminderEmail({
        instructorName: trialSession.instructorName,
        datetime: trialSession.datetime,
        location: trialSession.location ?? DEFAULT_LOCATION,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
      await prisma.trialSession.update({
        where: { id: trialSession.id },
        data: { instructorReminderSentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      console.error(
        `講師向け体験会リマインドメール送信に失敗しました (trialSessionId=${trialSession.id}):`,
        error
      );
      failed += 1;
    }
  }

  return { targetTrialSessions: trialSessions.length, sent, failed, skipped };
}

/**
 * Lesson 3を受講した翌日に、アンケート依頼メールを自動送信する
 * (グループレッスンの受講者向け)。
 */
async function runLesson3SurveyBatch() {
  if (!LESSON3_SURVEY_ENABLED) {
    return { targetLessons: 0, sent: 0, failed: 0, disabled: true };
  }

  const { start, end } = getJstDayWindow(-1);

  const lessons = await prisma.lesson.findMany({
    where: { name: "Lesson 3", datetime: { gte: start, lt: end } },
    include: {
      bookings: { where: { lesson3SurveyEmailSentAt: null, studentEmail: { not: null } } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const lesson of lessons) {
    for (const booking of lesson.bookings) {
      if (!booking.studentEmail) continue;
      try {
        const { subject, text, html } = buildLesson3SurveyEmail(booking.studentName);
        await sendMail({ to: booking.studentEmail, subject, text, html });
        await prisma.booking.update({
          where: { id: booking.id },
          data: { lesson3SurveyEmailSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(`Lesson3アンケートメール送信に失敗しました (bookingId=${booking.id}):`, error);
        failed += 1;
      }
    }
  }

  return { targetLessons: lessons.length, sent, failed };
}

/**
 * Lesson 3(個別レッスン)を受講した翌日に、アンケート依頼メールを自動送信する。
 */
async function runIndividualLesson3SurveyBatch() {
  if (!LESSON3_SURVEY_ENABLED) {
    return { targetIndividualLessons: 0, sent: 0, failed: 0, disabled: true };
  }

  const { start, end } = getJstDayWindow(-1);

  const individualLessons = await prisma.individualLesson.findMany({
    where: { name: "Lesson 3", datetime: { gte: start, lt: end } },
    include: {
      participants: { where: { lesson3SurveyEmailSentAt: null } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const individualLesson of individualLessons) {
    for (const participant of individualLesson.participants) {
      try {
        const { subject, text, html } = buildLesson3SurveyEmail(participant.studentName);
        await sendMail({ to: participant.studentEmail, subject, text, html });
        await prisma.individualParticipant.update({
          where: { id: participant.id },
          data: { lesson3SurveyEmailSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(
          `Lesson3アンケートメール送信に失敗しました (participantId=${participant.id}):`,
          error
        );
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

  const [
    lessonResult,
    trialResult,
    individualResult,
    lesson3SurveyResult,
    individualLesson3SurveyResult,
    instructorLessonReminderResult,
    instructorTrialReminderResult,
  ] = await Promise.all([
    runReminderBatch(),
    runTrialReminderBatch(),
    runIndividualLessonReminderBatch(),
    runLesson3SurveyBatch(),
    runIndividualLesson3SurveyBatch(),
    runInstructorLessonReminderBatch(),
    runInstructorTrialReminderBatch(),
  ]);
  return NextResponse.json({
    lessons: lessonResult,
    trialSessions: trialResult,
    individualLessons: individualResult,
    lesson3Survey: lesson3SurveyResult,
    individualLesson3Survey: individualLesson3SurveyResult,
    instructorLessonReminder: instructorLessonReminderResult,
    instructorTrialReminder: instructorTrialReminderResult,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
