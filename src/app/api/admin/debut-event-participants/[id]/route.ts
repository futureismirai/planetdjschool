import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { EVENT_PARTICIPATION_OPTIONS } from "@/lib/constants";

const STATUS_VALUES = [...EVENT_PARTICIPATION_OPTIONS.map((o) => o.value), "pending"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * デビューイベント参加者の情報を更新するAPI。参加状況(status)に加えて、
 * 名前・DJネーム・Instagramアカウント・メールアドレスを管理者が手動で編集できるようにする。
 * 渡されたフィールドのみ更新する。
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

  const { status, studentName, djName, instagramHandle, studentEmail } = (body ?? {}) as Record<
    string,
    unknown
  >;

  const data: Record<string, string | null> = {};

  if (status !== undefined) {
    if (typeof status !== "string" || !STATUS_VALUES.includes(status)) {
      return NextResponse.json({ error: "参加状況の形式が正しくありません。" }, { status: 400 });
    }
    data.status = status;
  }
  if (studentName !== undefined) {
    if (typeof studentName !== "string" || !studentName.trim()) {
      return NextResponse.json({ error: "名前を入力してください。" }, { status: 400 });
    }
    data.studentName = studentName.trim();
  }
  if (djName !== undefined) {
    if (typeof djName !== "string") {
      return NextResponse.json({ error: "DJネームの形式が正しくありません。" }, { status: 400 });
    }
    data.djName = djName.trim() || null;
  }
  if (instagramHandle !== undefined) {
    if (typeof instagramHandle !== "string") {
      return NextResponse.json({ error: "Instagramアカウントの形式が正しくありません。" }, { status: 400 });
    }
    data.instagramHandle = instagramHandle.trim() || null;
  }
  if (studentEmail !== undefined) {
    if (typeof studentEmail !== "string" || !EMAIL_RE.test(studentEmail.trim())) {
      return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
    }
    data.studentEmail = studentEmail.trim().toLowerCase();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新する項目がありません。" }, { status: 400 });
  }

  try {
    const participant = await prisma.debutEventParticipant.update({ where: { id }, data });
    return NextResponse.json({ participant });
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "このイベントには既に同じメールアドレスの生徒が登録されています。" },
        { status: 409 }
      );
    }
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
