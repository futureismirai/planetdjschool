import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEventFloorInput } from "@/lib/organizerInput";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventDayId } = await params;

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

  const day = await prisma.eventDay.findUnique({ where: { id: eventDayId } });
  if (!day) {
    return NextResponse.json({ error: "開催日が見つかりません。" }, { status: 404 });
  }

  let name = parsed.data.name;
  if (!name) {
    const floorCount = await prisma.eventFloor.count({ where: { eventDayId } });
    name = `フロア${floorCount + 1}`;
  }

  const floor = await prisma.eventFloor.create({
    data: { ...parsed.data, name, eventDayId },
    include: { slots: true },
  });
  return NextResponse.json({ floor }, { status: 201 });
}
