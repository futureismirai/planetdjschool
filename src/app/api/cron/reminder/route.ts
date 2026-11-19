import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import {
  buildIndividualLessonReminderEmail,
  buildInstructorLessonReminderEmail,
  buildInstructorLessonStudioCancelEmail,
  buildInstructorTrialReminderEmail,
  buildInstructorTrialStudioCancelEmail,
  buildLesson3SurveyEmail,
  buildReminderEmail,
  buildTrialReminderEmail,
  GROUP_LESSON_DURATION_MINUTES,
} from "@/lib/emailTemplates";
import { getJstDayWindow } from "@/lib/date";
import { DEFAULT_LOCATION } from "@/lib/constants";
import { getInstructorEmailByName } from "@/lib/instructors";

const REMINDER_DAYS_BEFORE = 3;
const INSTRUCTOR_REMINDER_DAYS_BEFORE = 1;
// 学生のキャンセル期限(レッスン当日の8日前)の時点で定員に達していないレッスン・体験会は
// 中止扱いとなるため、担当講師へスタジオキャンセルをリマインドする。
const STUDIO_CANCEL_CHECK_DAYS_BEFORE = 8;
const HOUR_MS = 60 * 60 * 1000;

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

/** 指定時刻が含まれる「時」の開始時刻(切り捨て)。JSTはUTC+9の固定オフセットなのでUTCのまま計算してよい。 */
function hourFloor(date: Date): number {
  return Math.floor(date.getTime() / HOUR_MS) * HOUR_MS;
}

/** 指定時刻を含む「時」の終了時刻(切り上げ)。 */
function hourCeil(date: Date): number {
  const floor = hourFloor(date);
  return floor === date.getTime() ? floor : floor + HOUR_MS;
}

/** 開始〜終了時刻が占める1時間刻みのスタジオ枠(各枠の開始時刻、ms)を列挙する。 */
function hourSlotsFor(start: Date, end: Date): number[] {
  const slots: number[] = [];
  const endMs = hourCeil(end);
  for (let cur = hourFloor(start); cur < endMs; cur += HOUR_MS) {
    slots.push(cur);
  }
  return slots;
}

/** 1時間刻みのスタジオ枠(開始時刻のms配列)を、連続する範囲にまとめる。 */
function mergeConsecutiveHourSlots(slotsMs: number[]): { start: Date; end: Date }[] {
  const sorted = [...slotsMs].sort((a, b) => a - b);
  const ranges: { start: Date; end: Date }[] = [];
  for (const slot of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && last.end.getTime() === slot) {
      last.end = new Date(slot + HOUR_MS);
    } else {
      ranges.push({ start: new Date(slot), end: new Date(slot + HOUR_MS) });
    }
  }
  return ranges;
}

/**
 * 講師向け: レッスン当日の8日前(生徒のキャンセル期限)の時点で定員に達していない
 * (=中止扱いとなる)レッスンについて、担当講師にスタジオキャンセルをリマインドする。
 * スタジオは1時間刻みで予約されているため、同じ日・同じ場所のレッスンのうち
 * 中止とならないレッスンが使う時間枠を除いた、キャンセルすべき時間枠を計算して知らせる。
 */
async function runLessonStudioCancelReminderBatch() {
  const { start, end } = getJstDayWindow(STUDIO_CANCEL_CHECK_DAYS_BEFORE);

  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: start, lt: end } },
    include: { bookings: true },
    orderBy: { datetime: "asc" },
  });

  const groups = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = lesson.location ?? DEFAULT_LOCATION;
    const group = groups.get(key);
    if (group) {
      group.push(lesson);
    } else {
      groups.set(key, [lesson]);
    }
  }

  let targetLessons = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const groupLessons of groups.values()) {
    const isCancelled = (l: (typeof groupLessons)[number]) => l.bookings.length < l.maxSlots;
    const cancelledLessons = groupLessons.filter(isCancelled);
    if (cancelledLessons.length === 0) continue;

    const retainedSlots = new Set<number>();
    for (const l of groupLessons) {
      if (isCancelled(l)) continue;
      const lessonEnd = new Date(l.datetime.getTime() + GROUP_LESSON_DURATION_MINUTES * 60 * 1000);
      for (const slot of hourSlotsFor(l.datetime, lessonEnd)) {
        retainedSlots.add(slot);
      }
    }

    for (const lesson of cancelledLessons) {
      targetLessons += 1;
      if (lesson.studioCancelReminderSentAt) {
        skipped += 1;
        continue;
      }

      const instructorEmail = await getInstructorEmailByName(lesson.instructorName);
      if (!instructorEmail) {
        skipped += 1;
        continue;
      }

      const lessonEnd = new Date(lesson.datetime.getTime() + GROUP_LESSON_DURATION_MINUTES * 60 * 1000);
      const ownSlots = hourSlotsFor(lesson.datetime, lessonEnd);
      const freedSlots = ownSlots.filter((slot) => !retainedSlots.has(slot));
      const cancelRanges = mergeConsecutiveHourSlots(freedSlots.length > 0 ? freedSlots : ownSlots);

      try {
        const { subject, text, html } = buildInstructorLessonStudioCancelEmail({
          instructorName: lesson.instructorName,
          lessonName: lesson.name,
          datetime: lesson.datetime,
          cancelRanges,
        });
        await sendMail({ to: instructorEmail, subject, text, html });
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { studioCancelReminderSentAt: new Date() },
        });
        sent += 1;
      } catch (error) {
        console.error(
          `講師向けスタジオキャンセル依頼メール送信に失敗しました (lessonId=${lesson.id}):`,
          error
        );
        failed += 1;
      }
    }
  }

  return { targetLessons, sent, failed, skipped };
}

/**
 * 講師向け: 体験会当日の8日前の時点で定員に達していない(=中止扱いとなる)体験会について、
 * 担当講師にスタジオキャンセルをリマインドする。体験会は1時間のため、
 * 時間帯そのものをキャンセルすればよい(他の体験会との時間枠の調整は不要)。
 */
async function runTrialStudioCancelReminderBatch() {
  const { start, end } = getJstDayWindow(STUDIO_CANCEL_CHECK_DAYS_BEFORE);

  const trialSessions = await prisma.trialSession.findMany({
    where: { datetime: { gte: start, lt: end } },
    include: { participants: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const cancelledTrialSessions = trialSessions.filter((t) => t.participants.length < t.maxSlots);

  for (const trialSession of cancelledTrialSessions) {
    if (trialSession.studioCancelReminderSentAt) {
      skipped += 1;
      continue;
    }

    const instructorEmail = await getInstructorEmailByName(trialSession.instructorName);
    if (!instructorEmail) {
      skipped += 1;
      continue;
    }

    try {
      const { subject, text, html } = buildInstructorTrialStudioCancelEmail({
        instructorName: trialSession.instructorName,
        datetime: trialSession.datetime,
      });
      await sendMail({ to: instructorEmail, subject, text, html });
      await prisma.trialSession.update({
        where: { id: trialSession.id },
        data: { studioCancelReminderSentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      console.error(
        `講師向け体験会スタジオキャンセル依頼メール送信に失敗しました (trialSessionId=${trialSession.id}):`,
        error
      );
      failed += 1;
    }
  }

  return { targetTrialSessions: cancelledTrialSessions.length, sent, failed, skipped };
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
    instructorLessonStudioCancelResult,
    instructorTrialStudioCancelResult,
  ] = await Promise.all([
    runReminderBatch(),
    runTrialReminderBatch(),
    runIndividualLessonReminderBatch(),
    runLesson3SurveyBatch(),
    runIndividualLesson3SurveyBatch(),
    runInstructorLessonReminderBatch(),
    runInstructorTrialReminderBatch(),
    runLessonStudioCancelReminderBatch(),
    runTrialStudioCancelReminderBatch(),
  ]);
  return NextResponse.json({
    lessons: lessonResult,
    trialSessions: trialResult,
    individualLessons: individualResult,
    lesson3Survey: lesson3SurveyResult,
    individualLesson3Survey: individualLesson3SurveyResult,
    instructorLessonReminder: instructorLessonReminderResult,
    instructorTrialReminder: instructorTrialReminderResult,
    instructorLessonStudioCancel: instructorLessonStudioCancelResult,
    instructorTrialStudioCancel: instructorTrialStudioCancelResult,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
