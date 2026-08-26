import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 出演者一覧表の並びを名前順（A→Z）に並び替えて保存する */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: performerRosterId } = await params;

  const entries = await prisma.performerRosterEntry.findMany({ where: { performerRosterId } });
  if (entries.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, "ja"));

  const updated = await prisma.$transaction(
    sorted.map((entry, index) =>
      prisma.performerRosterEntry.update({ where: { id: entry.id }, data: { order: index } })
    )
  );

  return NextResponse.json({ entries: updated.sort((a, b) => a.order - b.order) });
}
