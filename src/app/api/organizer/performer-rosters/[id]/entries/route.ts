import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: performerRosterId } = await params;

  const roster = await prisma.performerRoster.findUnique({ where: { id: performerRosterId } });
  if (!roster) {
    return NextResponse.json({ error: "一覧表が見つかりません。" }, { status: 404 });
  }

  const count = await prisma.performerRosterEntry.count({ where: { performerRosterId } });
  const entry = await prisma.performerRosterEntry.create({
    data: { performerRosterId, name: "新しい出演者", order: count },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
