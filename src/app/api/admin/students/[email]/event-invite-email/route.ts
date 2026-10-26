import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { buildEventInviteEmail } from "@/lib/emailTemplates";
import { getStudents } from "@/lib/students";

/**
 * イベント出演案内メールを送信するAPI。管理者が編集画面で入力した本文(挨拶・自由記載部分)と
 * イベント日時をもとに、参加可否の確認・アンケート(テキスト回答形式)を自動で付与して送信する。
 * このボタンは一度送信しても非表示にならない(何度でもイベントごとに送信できる)。
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email).trim().toLowerCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { text, eventDateTimeText } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "本文を入力してください。" }, { status: 400 });
  }
  if (typeof eventDateTimeText !== "string" || !eventDateTimeText.trim()) {
    return NextResponse.json({ error: "イベント日時を入力してください。" }, { status: 400 });
  }

  const students = await getStudents();
  const student = students.find((s) => s.email === decodedEmail);
  if (!student) {
    return NextResponse.json({ error: "生徒が見つかりません。" }, { status: 404 });
  }

  try {
    const { subject, text: mailText, html } = buildEventInviteEmail(text, eventDateTimeText.trim());
    await sendMail({ to: student.email, subject, text: mailText, html });
  } catch (mailError) {
    console.error("イベント出演案内メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
