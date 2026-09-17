import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSlotInput, parseRounding } from "@/lib/organizerInput";
import { rebalanceFloorSlots } from "@/lib/floorRebalance";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventFloorId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseSlotInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const floor = await prisma.eventFloor.findUnique({ where: { id: eventFloorId } });
  if (!floor) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }

  const maxOrder = await prisma.timetableSlot.aggregate({
    where: { eventFloorId },
    _max: { order: true },
  });

  const created = await prisma.timetableSlot.create({
    data: {
      ...parsed.data,
      eventFloorId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  // 出演者を追加したら、開催時間全体を固定されていない出演者の人数で
  // 自動で割り直す
  const rounding = parseRounding((body as Record<string, unknown>)?.rounding);
  const result = await rebalanceFloorSlots(eventFloorId, rounding);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const slot = result.slots.find((s) => s.id === created.id) ?? created;
  return NextResponse.json({ slot, slots: result.slots }, { status: 201 });
}
