import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 出演者名のオートコンプリート候補を返す（クエリなしの場合は最近使ったものを返す） */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const performers = await prisma.performer.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  return NextResponse.json({ performers });
}
