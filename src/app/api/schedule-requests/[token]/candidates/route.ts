import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { combineJstDateAndTime } from "@/lib/date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

type CandidateInput = { date: string; startTime: string; endTime: string };

/**
 * 日程調整の候補日時を生徒が送信するための公開API(認証不要)。
 * 送信のたびに、その依頼の候補を全て置き換える(編集・再送信を想定)。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { candidates, note } = (body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: "候補日を1件以上選択してください。" }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "備考の形式が正しくありません。" }, { status: 400 });
  }

  const scheduleRequest = await prisma.scheduleRequest.findUnique({ where: { token } });
  if (!scheduleRequest) {
    return NextResponse.json({ error: "日程調整依頼が見つかりません。" }, { status: 404 });
  }
  if (scheduleRequest.status === "confirmed") {
    return NextResponse.json({ error: "この依頼は既に日程が確定しています。" }, { status: 409 });
  }

  const parsed: { startDatetime: Date; endDatetime: Date }[] = [];
  for (const raw of candidates as unknown[]) {
    const c = (raw ?? {}) as Record<string, unknown>;
    const { date, startTime, endTime } = c as CandidateInput;

    if (typeof date !== "string" || !DATE_RE.test(date)) {
      return NextResponse.json({ error: "候補日の形式が正しくありません。" }, { status: 400 });
    }
    if (typeof startTime !== "string" || !TIME_RE.test(startTime) || typeof endTime !== "string" || !TIME_RE.test(endTime)) {
      return NextResponse.json({ error: "候補の時間帯の形式が正しくありません。" }, { status: 400 });
    }

    const startDatetime = combineJstDateAndTime(date, startTime);
    const endDatetime = combineJstDateAndTime(date, endTime);

    if (startDatetime >= endDatetime) {
      return NextResponse.json(
        { error: "候補の終了時刻は開始時刻より後にしてください。" },
        { status: 400 }
      );
    }
    if (startDatetime < scheduleRequest.windowStart || endDatetime > scheduleRequest.windowEnd) {
      return NextResponse.json(
        { error: "候補日は回答期間の範囲内でお選びください。" },
        { status: 400 }
      );
    }

    parsed.push({ startDatetime, endDatetime });
  }

  await prisma.$transaction([
    prisma.scheduleCandidate.deleteMany({ where: { scheduleRequestId: scheduleRequest.id } }),
    prisma.scheduleCandidate.createMany({
      data: parsed.map((p) => ({
        scheduleRequestId: scheduleRequest.id,
        startDatetime: p.startDatetime,
        endDatetime: p.endDatetime,
      })),
    }),
    prisma.scheduleRequest.update({
      where: { id: scheduleRequest.id },
      data: { note: typeof note === "string" && note.trim() ? note.trim() : null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
