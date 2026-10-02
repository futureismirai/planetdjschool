import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * 日程調整依頼の候補の中から1件を選び、確定済みにするAPI。
 * 実際の個別レッスン・参加者の作成は、既存の
 * /api/admin/individual-lessons と /api/admin/individual-participants を
 * クライアント側で続けて呼び出すことで行う(この確定APIは状態の記録のみ)。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { candidateId, confirmedDatetime } = (body ?? {}) as Record<string, unknown>;
  if (typeof candidateId !== "string" || !candidateId) {
    return NextResponse.json({ error: "候補を選択してください。" }, { status: 400 });
  }
  if (
    confirmedDatetime !== undefined &&
    (typeof confirmedDatetime !== "string" || Number.isNaN(new Date(confirmedDatetime).getTime()))
  ) {
    return NextResponse.json({ error: "確定日時の形式が正しくありません。" }, { status: 400 });
  }

  const scheduleRequest = await prisma.scheduleRequest.findUnique({ where: { id } });
  if (!scheduleRequest) {
    return NextResponse.json({ error: "日程調整依頼が見つかりません。" }, { status: 404 });
  }
  if (scheduleRequest.status === "confirmed") {
    return NextResponse.json({ error: "この依頼は既に確定済みです。" }, { status: 409 });
  }

  const candidate = await prisma.scheduleCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.scheduleRequestId !== id) {
    return NextResponse.json({ error: "候補が見つかりません。" }, { status: 404 });
  }

  let finalDatetime = candidate.startDatetime;
  if (typeof confirmedDatetime === "string") {
    const parsed = new Date(confirmedDatetime);
    if (parsed >= candidate.startDatetime && parsed <= candidate.endDatetime) {
      finalDatetime = parsed;
    }
  }

  const updated = await prisma.scheduleRequest.update({
    where: { id },
    data: {
      status: "confirmed",
      confirmedDatetime: finalDatetime,
      confirmedAt: new Date(),
    },
  });

  return NextResponse.json({ scheduleRequest: updated });
}
