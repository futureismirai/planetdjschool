import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseReorderInput } from "@/lib/organizerInput";
import { slotDurationMinutes, toHHMM, toMinutes } from "@/lib/timetable";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventFloorId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseReorderInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const floor = await prisma.eventFloor.findUnique({
    where: { id: eventFloorId },
    include: { slots: true },
  });
  if (!floor) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }
  const slotsById = new Map(floor.slots.map((s) => [s.id, s]));

  // 出演順を入れ替えても各出演者の出演時間(分)はそのまま保ち、
  // 新しい順番に合わせて開始・終了時刻だけを先頭から詰め直す
  let cursor = toMinutes(floor.startTime);
  const updates = parsed.data.orderedIds.flatMap((id, index) => {
    const slot = slotsById.get(id);
    if (!slot) return [];
    const duration = slotDurationMinutes(slot.startTime, slot.endTime);
    const startTime = toHHMM(cursor);
    const endTime = toHHMM(cursor + duration);
    cursor += duration;
    return [prisma.timetableSlot.update({ where: { id }, data: { order: index, startTime, endTime } })];
  });

  await prisma.$transaction(updates);

  const slots = await prisma.timetableSlot.findMany({
    where: { eventFloorId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ slots });
}
