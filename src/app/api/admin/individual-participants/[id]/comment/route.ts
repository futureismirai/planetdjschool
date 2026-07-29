import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * 生徒別ページから、この個別レッスンでの進捗コメントを更新するAPI(noteとは別項目)。
 */
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

  const { comment } = (body ?? {}) as Record<string, unknown>;
  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return NextResponse.json({ error: "コメントの形式が正しくありません。" }, { status: 400 });
  }

  try {
    const participant = await prisma.individualParticipant.update({
      where: { id },
      data: {
        comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
        commentUpdatedAt: new Date(),
      },
    });
    return NextResponse.json({ participant });
  } catch {
    return NextResponse.json({ error: "参加者が見つかりません。" }, { status: 404 });
  }
}
