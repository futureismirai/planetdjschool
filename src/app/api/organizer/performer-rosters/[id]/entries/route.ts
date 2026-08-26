import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: performerRosterId } = await params;

  const roster = await prisma.performerRoster.findUnique({ where: { id: performerRosterId } });
  if (!roster) {
    return NextResponse.json({ error: "一覧が見つかりません。" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const isCategory = Boolean((body as Record<string, unknown>)?.isCategory);
  const categoryName = (body as Record<string, unknown>)?.name;

  if (isCategory && (typeof categoryName !== "string" || !categoryName.trim())) {
    return NextResponse.json({ error: "見出し名を入力してください。" }, { status: 400 });
  }

  const count = await prisma.performerRosterEntry.count({ where: { performerRosterId } });
  const entry = await prisma.performerRosterEntry.create({
    data: isCategory
      ? { performerRosterId, name: (categoryName as string).trim(), isCategory: true, order: count }
      : { performerRosterId, name: "新しい出演者", order: count },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
