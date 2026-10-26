import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { EVENT_PARTICIPATION_OPTIONS } from "@/lib/constants";

const STATUS_VALUES = [...EVENT_PARTICIPATION_OPTIONS.map((o) => o.value), "pending"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { status } = (body ?? {}) as Record<string, unknown>;
  if (typeof status !== "string" || !STATUS_VALUES.includes(status)) {
    return NextResponse.json({ error: "参加状況の形式が正しくありません。" }, { status: 400 });
  }

  try {
    const participant = await prisma.debutEventParticipant.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ participant });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.debutEventParticipant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }
}
