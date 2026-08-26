import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePerformerRosterInput } from "@/lib/organizerInput";

export async function GET() {
  const rosters = await prisma.performerRoster.findMany({
    orderBy: { updatedAt: "desc" },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json({ rosters });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parsePerformerRosterInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const importFromEventId = (body as Record<string, unknown>)?.importFromEventId;

  let entriesToCreate: { name: string; snsHandle: string | null; order: number }[] = [];

  if (typeof importFromEventId === "string" && importFromEventId) {
    const event = await prisma.event.findUnique({
      where: { id: importFromEventId },
      include: { days: { include: { floors: { include: { slots: true } } } } },
    });
    if (!event) {
      return NextResponse.json({ error: "引用元のイベントが見つかりません。" }, { status: 404 });
    }

    const byName = new Map<string, string | null>();
    for (const day of event.days) {
      for (const floor of day.floors) {
        for (const slot of floor.slots) {
          const name = slot.performerName.trim();
          if (!name) continue;
          if (!byName.has(name) || (!byName.get(name) && slot.snsHandle)) {
            byName.set(name, slot.snsHandle);
          }
        }
      }
    }

    entriesToCreate = [...byName.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ja"))
      .map(([name, snsHandle], index) => ({ name, snsHandle, order: index }));
  }

  const roster = await prisma.performerRoster.create({
    data: {
      name: parsed.data.name,
      entries: { create: entriesToCreate },
    },
    include: { entries: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ roster }, { status: 201 });
}
