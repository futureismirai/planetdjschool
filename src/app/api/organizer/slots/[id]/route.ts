import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSlotInput } from "@/lib/organizerInput";
import { generateTimetable, slotDurationMinutes, type PerformerInput, type RoundingMode } from "@/lib/timetable";

function parseRounding(value: unknown): RoundingMode {
  return value === "5min" || value === "10min" ? value : "none";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  const existing = await prisma.timetableSlot.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "出演枠が見つかりません。" }, { status: 404 });
  }

  const timeChanged =
    parsed.data.startTime !== existing.startTime || parsed.data.endTime !== existing.endTime;

  if (!timeChanged) {
    const slot = await prisma.timetableSlot.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ slot });
  }

  // 時間を直接変更した場合は、「時間固定」がついていない他の出演者の時間を
  // 自動で均等に再配分する（時間固定の人は現在の出演時間を保ったまま）
  const floor = await prisma.eventFloor.findUnique({
    where: { id: existing.eventFloorId },
    include: { slots: { orderBy: { order: "asc" } } },
  });
  if (!floor) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }

  const editedDuration = slotDurationMinutes(parsed.data.startTime, parsed.data.endTime);

  const performers: PerformerInput[] = floor.slots.map((s) => {
    if (s.id === id) {
      return {
        name: parsed.data.performerName,
        snsHandle: parsed.data.snsHandle ?? undefined,
        fixedDurationMinutes: editedDuration,
      };
    }
    if (s.isFixed) {
      return {
        name: s.performerName,
        snsHandle: s.snsHandle ?? undefined,
        fixedDurationMinutes: slotDurationMinutes(s.startTime, s.endTime),
      };
    }
    return { name: s.performerName, snsHandle: s.snsHandle ?? undefined };
  });

  const rounding = parseRounding((body as Record<string, unknown>)?.rounding);

  let generated;
  try {
    generated = generateTimetable(performers, floor.startTime, floor.endTime, rounding);
  } catch (e) {
    const message = e instanceof Error ? e.message : "時間の再計算に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updatedSlots = await prisma.$transaction(
    floor.slots.map((s, index) =>
      s.id === id
        ? prisma.timetableSlot.update({
            where: { id: s.id },
            data: {
              performerName: parsed.data.performerName,
              snsHandle: parsed.data.snsHandle,
              isFixed: parsed.data.isFixed,
              startTime: generated[index].startTime,
              endTime: generated[index].endTime,
            },
          })
        : prisma.timetableSlot.update({
            where: { id: s.id },
            data: { startTime: generated[index].startTime, endTime: generated[index].endTime },
          })
    )
  );

  const slot = updatedSlots.find((s) => s.id === id);
  return NextResponse.json({ slot, slots: updatedSlots });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.timetableSlot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "出演枠が見つかりません。" }, { status: 404 });
  }
}
