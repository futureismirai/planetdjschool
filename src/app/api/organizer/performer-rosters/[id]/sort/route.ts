import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Entry = { id: string; name: string; isCategory: boolean };

/**
 * 見出し行の位置は固定したまま、見出しで区切られたまとまりごとに
 * 出演者だけを名前順（A→Z）に並び替える。
 */
function sortWithinSegments<T extends Entry>(entries: T[]): T[] {
  const result: T[] = [];
  let segment: T[] = [];

  function flushSegment() {
    segment.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    result.push(...segment);
    segment = [];
  }

  for (const entry of entries) {
    if (entry.isCategory) {
      flushSegment();
      result.push(entry);
    } else {
      segment.push(entry);
    }
  }
  flushSegment();

  return result;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: performerRosterId } = await params;

  const entries = await prisma.performerRosterEntry.findMany({
    where: { performerRosterId },
    orderBy: { order: "asc" },
  });
  if (entries.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const sorted = sortWithinSegments(entries);

  const updated = await prisma.$transaction(
    sorted.map((entry, index) =>
      prisma.performerRosterEntry.update({ where: { id: entry.id }, data: { order: index } })
    )
  );

  return NextResponse.json({ entries: updated.sort((a, b) => a.order - b.order) });
}
