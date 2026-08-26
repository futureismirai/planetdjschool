import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseRounding } from "@/lib/organizerInput";
import { rebalanceFloorSlots } from "@/lib/floorRebalance";

/** 出演者一覧から出演者をまとめて出演枠として追加し、フロア全体の時間を再計算する */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventFloorId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const performerRosterId = (body as Record<string, unknown>)?.performerRosterId;
  if (typeof performerRosterId !== "string" || !performerRosterId) {
    return NextResponse.json({ error: "出演者一覧を選択してください。" }, { status: 400 });
  }

  const floor = await prisma.eventFloor.findUnique({ where: { id: eventFloorId } });
  if (!floor) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }

  const roster = await prisma.performerRoster.findUnique({
    where: { id: performerRosterId },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  if (!roster) {
    return NextResponse.json({ error: "出演者一覧が見つかりません。" }, { status: 404 });
  }
  const performerEntries = roster.entries.filter((entry) => !entry.isCategory);
  if (performerEntries.length === 0) {
    return NextResponse.json({ error: "この出演者一覧には出演者がいません。" }, { status: 400 });
  }

  const maxOrder = await prisma.timetableSlot.aggregate({
    where: { eventFloorId },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  await prisma.timetableSlot.createMany({
    data: performerEntries.map((entry) => ({
      eventFloorId,
      performerName: entry.name,
      snsHandle: entry.snsHandle,
      startTime: floor.startTime,
      endTime: floor.endTime,
      isFixed: false,
      order: nextOrder++,
    })),
  });

  const rounding = parseRounding((body as Record<string, unknown>)?.rounding);
  const result = await rebalanceFloorSlots(eventFloorId, rounding);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ slots: result.slots });
}
