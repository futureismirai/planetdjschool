import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseReorderInput } from "@/lib/organizerInput";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseReorderInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.performerRosterEntry.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ entries: updated.sort((a, b) => a.order - b.order) });
}
