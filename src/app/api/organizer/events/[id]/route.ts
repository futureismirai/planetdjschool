import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEventInput } from "@/lib/organizerInput";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      days: {
        orderBy: [{ date: "asc" }, { order: "asc" }],
        include: {
          floors: {
            orderBy: { order: "asc" },
            include: { slots: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "イベントが見つかりません。" }, { status: 404 });
  }
  return NextResponse.json({ event });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseEventInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const event = await prisma.event.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: "イベントが見つかりません。" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "イベントが見つかりません。" }, { status: 404 });
  }
}
