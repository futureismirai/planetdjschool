import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseGenerateInput } from "@/lib/organizerInput";
import { generateTimetable } from "@/lib/timetable";

/** タイムテーブルを自動作成し、このフロアの既存の枠をすべて置き換える */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: floorId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseGenerateInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const floor = await prisma.eventFloor.findUnique({ where: { id: floorId } });
  if (!floor) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }

  let generated;
  try {
    generated = generateTimetable(parsed.data.performers, floor.startTime, floor.endTime, parsed.data.rounding);
  } catch (e) {
    const message = e instanceof Error ? e.message : "タイムテーブルの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const floorWithSlots = await prisma.$transaction(async (tx) => {
    await tx.timetableSlot.deleteMany({ where: { eventFloorId: floorId } });
    await tx.timetableSlot.createMany({
      data: generated.map((slot, index) => ({
        eventFloorId: floorId,
        performerName: slot.name,
        snsHandle: slot.snsHandle ?? null,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isFixed: slot.isFixed,
        order: index,
      })),
    });
    return tx.eventFloor.findUnique({
      where: { id: floorId },
      include: { slots: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json({ floor: floorWithSlots });
}
