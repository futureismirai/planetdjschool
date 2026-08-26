import { prisma } from "@/lib/prisma";
import { generateTimetable, slotDurationMinutes, type PerformerInput, type RoundingMode } from "@/lib/timetable";

/**
 * フロアの開始・終了時刻や区切り方が変わった際に、時間固定の出演者の
 * 出演時間を保ったまま、固定されていない出演者の時間を自動で再配分する。
 */
export async function rebalanceFloorSlots(
  floorId: string,
  rounding: RoundingMode
): Promise<{ slots: Awaited<ReturnType<typeof prisma.timetableSlot.findMany>> } | { error: string }> {
  const floor = await prisma.eventFloor.findUnique({
    where: { id: floorId },
    include: { slots: { orderBy: { order: "asc" } } },
  });
  if (!floor) {
    return { error: "フロアが見つかりません。" };
  }
  if (floor.slots.length === 0) {
    return { slots: [] };
  }

  const performers: PerformerInput[] = floor.slots.map((s) => ({
    name: s.performerName,
    snsHandle: s.snsHandle ?? undefined,
    fixedDurationMinutes: s.isFixed ? slotDurationMinutes(s.startTime, s.endTime) : undefined,
  }));

  let generated;
  try {
    generated = generateTimetable(performers, floor.startTime, floor.endTime, rounding);
  } catch (e) {
    const message = e instanceof Error ? e.message : "時間の再計算に失敗しました。";
    return { error: message };
  }

  const slots = await prisma.$transaction(
    floor.slots.map((s, index) =>
      prisma.timetableSlot.update({
        where: { id: s.id },
        data: { startTime: generated[index].startTime, endTime: generated[index].endTime },
      })
    )
  );

  return { slots };
}
