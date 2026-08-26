import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEventInput } from "@/lib/organizerInput";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: { floors: { select: { id: true } } },
      },
    },
  });
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
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

  const event = await prisma.event.create({ data: parsed.data });
  return NextResponse.json({ event }, { status: 201 });
}
