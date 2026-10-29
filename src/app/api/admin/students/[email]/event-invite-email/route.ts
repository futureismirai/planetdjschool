import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { buildEventInviteEmail } from "@/lib/emailTemplates";
import { getStudents } from "@/lib/students";
import { combineJstDateAndTime, formatDateOnly, formatDateTimeRange } from "@/lib/date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function bookingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://planetdjschool.vercel.app";
}

/**
 * イベント出演案内メールを送信するAPI。管理者が選択した「デビューイベント」の枠に対して
 * 回答用トークン(EventInviteResponse)を発行し、参加可否・受講後アンケートに回答する
 * 公開ページ(/event-response/[token])へのリンクを本文に付与して送信する。
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

  const { text, eventId, deadline } = (body ?? {}) as Record<string, unknown>;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "本文を入力してください。" }, { status: 400 });
  }
  if (typeof eventId !== "string" || !eventId.trim()) {
    return NextResponse.json({ error: "イベントを選択してください。" }, { status: 400 });
  }
  if (typeof deadline !== "string" || !DATE_RE.test(deadline)) {
    return NextResponse.json({ error: "回答期限を正しく設定してください。" }, { status: 400 });
  }
  const deadlineDate = combineJstDateAndTime(deadline, "23:59");

  const [students, event] = await Promise.all([
    getStudents(),
    prisma.debutEvent.findUnique({ where: { id: eventId } }),
  ]);

  const student = students.find((s) => s.email === decodedEmail);
  if (!student) {
    return NextResponse.json({ error: "生徒が見つかりません。" }, { status: 404 });
  }
  if (!event) {
    return NextResponse.json({ error: "イベントが見つかりません。" }, { status: 404 });
  }

  const inviteResponse = await prisma.eventInviteResponse.create({
    data: {
      eventId: event.id,
      studentName: student.displayName,
      studentEmail: student.email,
    },
  });

  const url = `${bookingSiteUrl()}/event-response/${inviteResponse.token}`;

  try {
    const { subject, text: mailText, html } = buildEventInviteEmail(
      text,
      {
        eventDateTimeText: formatDateTimeRange(event.startDatetime, event.endDatetime),
        venue: event.venue,
        deadlineText: formatDateOnly(deadlineDate),
      },
      url
    );
    await sendMail({ to: student.email, subject, text: mailText, html });
  } catch (mailError) {
    console.error("イベント出演案内メールの送信に失敗しました:", mailError);
    return NextResponse.json({ error: "メールの送信に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
