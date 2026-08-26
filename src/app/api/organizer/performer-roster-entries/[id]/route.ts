import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePerformerRosterEntryInput } from "@/lib/organizerInput";
import { rememberPerformer } from "@/lib/performerDirectory";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parsePerformerRosterEntryInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const entry = await prisma.performerRosterEntry.update({ where: { id }, data: parsed.data });
    await rememberPerformer(parsed.data.name, parsed.data.snsHandle);
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "出演者が見つかりません。" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.performerRosterEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "出演者が見つかりません。" }, { status: 404 });
  }
}
