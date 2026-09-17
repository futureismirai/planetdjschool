import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { formatLessonDateTime } from "@/lib/date";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_TO = "ginzamember1@gmail.com";

/**
 * 追加レッスン(グループ/プライベート)の申し込みフォーム送信を受け付けるAPI。
 * 通常の予約とは異なり、DBへの予約作成や生徒への確認メール送信は行わない。
 * 申し込み内容をそのままginzamember1@gmail.comへ通知するのみ。
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const { type, name, email } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "お名前を入力してください。" }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "メールアドレスを正しく入力してください。" }, { status: 400 });
  }

  if (type === "group") {
    const { lessonId } = body as Record<string, unknown>;
    if (typeof lessonId !== "string" || !lessonId) {
      return NextResponse.json({ error: "受講希望日を選択してください。" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return NextResponse.json({ error: "選択されたレッスンが見つかりません。" }, { status: 404 });
    }

    const subject = "【追加レッスン申し込み】グループレッスン";
    const text = `追加レッスン(グループ)の申し込みがありました。

お名前: ${name.trim()}
メールアドレス: ${email.trim()}
受講希望日: ${lesson.name} ${formatLessonDateTime(lesson.datetime)}（講師: ${lesson.instructorName}）`;

    await sendMail({
      to: NOTIFY_TO,
      subject,
      text,
      html: `<div style="white-space:pre-wrap;">${escapeHtml(text)}</div>`,
    });

    return NextResponse.json({ ok: true });
  }

  if (type === "private") {
    const { desiredSchedule } = body as Record<string, unknown>;
    if (typeof desiredSchedule !== "string" || !desiredSchedule.trim()) {
      return NextResponse.json({ error: "可能な日付・時間を入力してください。" }, { status: 400 });
    }

    const subject = "【追加レッスン申し込み】プライベートレッスン";
    const text = `追加レッスン(プライベート)の申し込みがありました。

お名前: ${name.trim()}
メールアドレス: ${email.trim()}
可能な日付・時間: ${desiredSchedule.trim()}`;

    await sendMail({
      to: NOTIFY_TO,
      subject,
      text,
      html: `<div style="white-space:pre-wrap;">${escapeHtml(text)}</div>`,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "typeパラメータが正しくありません。" }, { status: 400 });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
