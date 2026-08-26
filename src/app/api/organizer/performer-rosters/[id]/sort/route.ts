import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 出演者一覧の並びを名前順（A→Z）に並び替えて保存する。
 * 分類の見出し行はその位置に固定し、見出しで区切られた出演者だけを
 * それぞれのまとまりの中で名前順に並び替える。
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: performerRosterId } = await params;

  const entries = await prisma.performerRosterEntry.findMany({
    where: { performerRosterId },
    orderBy: { order: "asc" },
  });
  if (entries.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const performerIndices: number[] = [];
  const performerNames: { index: number; name: string }[] = [];
  entries.forEach((entry, index) => {
    if (!entry.isCategory) {
      performerIndices.push(index);
      performerNames.push({ index, name: entry.name });
    }
  });
  const sortedNames = [...performerNames].sort((a, b) => a.name.localeCompare(b.name, "ja"));

  const finalOrder = [...entries];
  performerIndices.forEach((slotIndex, i) => {
    const original = entries[sortedNames[i].index];
    finalOrder[slotIndex] = original;
  });

  const updated = await prisma.$transaction(
    finalOrder.map((entry, index) =>
      prisma.performerRosterEntry.update({ where: { id: entry.id }, data: { order: index } })
    )
  );

  return NextResponse.json({ entries: updated.sort((a, b) => a.order - b.order) });
}
