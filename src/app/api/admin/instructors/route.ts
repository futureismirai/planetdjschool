import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { name, email } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "講師名を入力してください。" }, { status: 400 });
  }
  if (email !== undefined && email !== null && email !== "" && typeof email === "string" && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  try {
    const instructor = await prisma.instructor.create({
      data: {
        name: name.trim(),
        email: typeof email === "string" && email.trim() ? email.trim() : null,
      },
    });
    return NextResponse.json({ instructor }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "この講師名は既に登録されています。" }, { status: 409 });
  }
}
