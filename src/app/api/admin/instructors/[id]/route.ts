import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { email } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string") {
    return NextResponse.json({ error: "メールアドレスの形式が正しくありません。" }, { status: 400 });
  }
  if (email.trim() && !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  try {
    const instructor = await prisma.instructor.update({
      where: { id },
      data: { email: email.trim() || null },
    });
    return NextResponse.json({ instructor });
  } catch {
    return NextResponse.json({ error: "講師が見つかりません。" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.instructor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "講師が見つかりません。" }, { status: 404 });
  }
}
