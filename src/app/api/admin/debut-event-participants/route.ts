import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * デビューイベントに生徒を手動で追加するAPI。回答ページからの反映(source: "response")とは別に、
 * 管理者が直接追加する場合はこちら(source: "admin")を使用する。
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { eventId, studentName, studentEmail } = (body ?? {}) as Record<string, unknown>;

  if (typeof eventId !== "string" || !eventId.trim()) {
    return NextResponse.json({ error: "イベントを指定してください。" }, { status: 400 });
  }
  if (typeof studentName !== "string" || !studentName.trim()) {
    return NextResponse.json({ error: "生徒名を入力してください。" }, { status: 400 });
  }
  if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  try {
    const participant = await prisma.debutEventParticipant.create({
      data: {
        eventId: eventId.trim(),
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim().toLowerCase(),
        status: "participating",
        source: "admin",
      },
    });
    return NextResponse.json({ participant }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "このイベントには既に同じメールアドレスの生徒が登録されています。" }, { status: 409 });
  }
}
