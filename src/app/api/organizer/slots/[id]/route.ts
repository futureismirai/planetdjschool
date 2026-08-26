import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSlotInput } from "@/lib/organizerInput";
import { rememberPerformer } from "@/lib/performerDirectory";
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
  const isFixedChanged = parsed.data.isFixed !== existing.isFixed;

  if (!timeChanged && !isFixedChanged) {
    // order はこのエンドポイントの対象外（並び替えは専用のreorder APIで行う）。
    // parsed.data.order は未送信時に0がデフォルトされるため、そのまま使うと
    // 並び順が先頭にリセットされてしまう。
    const slot = await prisma.timetableSlot.update({
      where: { id },
      data: {
        performerName: parsed.data.performerName,
        snsHandle: parsed.data.snsHandle,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        isFixed: parsed.data.isFixed,
      },
    });
    await rememberPerformer(parsed.data.performerName, parsed.data.snsHandle);
    return NextResponse.json({ slot });
  }

  // 時間を直接変更、または「時間固定」のチェックを変更した場合は、
  // 固定されていない出演者の時間を自動で均等に再配分する
  // （時間固定の人は出演時間を保ったまま、対象の枠自身も現在のisFixedの値に従う）
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
        fixedDurationMinutes: parsed.data.isFixed ? editedDuration : undefined,
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

  await rememberPerformer(parsed.data.performerName, parsed.data.snsHandle);

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
