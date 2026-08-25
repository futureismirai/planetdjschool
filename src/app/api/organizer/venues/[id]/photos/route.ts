import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { parseVenuePhotoInput } from "@/lib/organizerInput";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: venueId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const parsed = parseVenuePhotoInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    return NextResponse.json({ error: "会場が見つかりません。" }, { status: 404 });
  }

  const maxOrder = await prisma.venuePhoto.aggregate({
    where: { venueId },
    _max: { order: true },
  });

  const photo = await prisma.venuePhoto.create({
    data: { ...parsed.data, venueId, order: (maxOrder._max.order ?? -1) + 1 },
  });
  return NextResponse.json({ photo }, { status: 201 });
}
