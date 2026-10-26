import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_PARTICIPATION_OPTIONS, SURVEY_QUESTIONS } from "@/lib/constants";

const PARTICIPATION_VALUES = EVENT_PARTICIPATION_OPTIONS.map((o) => o.value);

/**
 * イベント出演案内メールの回答(参加可否・受講後アンケート)を生徒が送信するための公開API(認証不要)。
 * 回答内容から、デビューイベントの参加者(DebutEventParticipant)への反映と、
 * 受講後アンケート(SurveyResponse)への保存を行う。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { participationAnswer, answers } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof participationAnswer !== "string" ||
    !PARTICIPATION_VALUES.includes(participationAnswer as (typeof PARTICIPATION_VALUES)[number])
  ) {
    return NextResponse.json({ error: "参加可否を選択してください。" }, { status: 400 });
  }

  const answersRecord = (answers ?? {}) as Record<string, unknown>;
  const parsedAnswers: Record<string, string> = {};
  for (const q of SURVEY_QUESTIONS) {
    const raw = answersRecord[q.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (q.required && !value) {
      return NextResponse.json({ error: `「${q.question}」にご回答ください。` }, { status: 400 });
    }
    if (q.type === "choice" && value && !q.options.includes(value)) {
      return NextResponse.json({ error: "アンケートの回答形式が正しくありません。" }, { status: 400 });
    }
    parsedAnswers[q.key] = value;
  }

  const inviteResponse = await prisma.eventInviteResponse.findUnique({ where: { token } });
  if (!inviteResponse) {
    return NextResponse.json({ error: "回答ページが見つかりません。" }, { status: 404 });
  }
  if (inviteResponse.status === "answered") {
    return NextResponse.json({ error: "この回答は既に送信済みです。" }, { status: 409 });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.eventInviteResponse.update({
      where: { id: inviteResponse.id },
      data: { status: "answered", participationAnswer, submittedAt: now },
    }),
    prisma.debutEventParticipant.upsert({
      where: {
        eventId_studentEmail: {
          eventId: inviteResponse.eventId,
          studentEmail: inviteResponse.studentEmail,
        },
      },
      update: { status: participationAnswer, source: "response", respondedAt: now },
      create: {
        eventId: inviteResponse.eventId,
        studentName: inviteResponse.studentName,
        studentEmail: inviteResponse.studentEmail,
        status: participationAnswer,
        source: "response",
        respondedAt: now,
      },
    }),
    prisma.surveyResponse.create({
      data: {
        studentName: inviteResponse.studentName,
        studentEmail: inviteResponse.studentEmail,
        djName: parsedAnswers.djName,
        joinStatus: parsedAnswers.joinStatus,
        lessonSufficiency: parsedAnswers.lessonSufficiency,
        moreToLearn: parsedAnswers.moreToLearn || null,
        wantsMoreLessons: parsedAnswers.wantsMoreLessons,
        improvements: parsedAnswers.improvements || null,
        message: parsedAnswers.message || null,
        submittedAt: now,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
