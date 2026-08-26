import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEventFloorInput, parseRounding } from "@/lib/organizerInput";
import { rebalanceFloorSlots } from "@/lib/floorRebalance";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseEventFloorInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await prisma.eventFloor.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }

  const timeChanged =
    parsed.data.startTime !== existing.startTime || parsed.data.endTime !== existing.endTime;

  await prisma.eventFloor.update({ where: { id }, data: parsed.data });

  if (timeChanged) {
    const rounding = parseRounding((body as Record<string, unknown>)?.rounding);
    const result = await rebalanceFloorSlots(id, rounding);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const floor = await prisma.eventFloor.findUnique({
    where: { id },
    include: { slots: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ floor });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.eventFloor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "フロアが見つかりません。" }, { status: 404 });
  }
}
