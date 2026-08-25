import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseSlotInput } from "@/lib/organizerInput";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const slot = await prisma.timetableSlot.create({
    data: {
      ...parsed.data,
      eventFloorId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  return NextResponse.json({ slot }, { status: 201 });
}
