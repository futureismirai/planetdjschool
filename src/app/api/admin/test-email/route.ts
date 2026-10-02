import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import {
  buildBookingConfirmationEmail,
  buildLesson3SurveyEmail,
  buildMembershipInvoiceDefaultText,
  buildMembershipInvoiceEmail,
} from "@/lib/emailTemplates";
import { formatDateOnly } from "@/lib/date";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.nextUrl.searchParams.get("secret") === secret;
}

/**
 * テンプレート確認用に、各種メールのサンプルを指定アドレスへ送信する。
 * サンドボックス環境からはGmail SMTPへ直接接続できないため、本番環境でブラウザから
 * 手動で叩いて送信するための一時的な確認用エンドポイント。
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = request.nextUrl.searchParams.get("to");
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: "toパラメータに送信先メールアドレスを指定してください。" }, { status: 400 });
  }

  // templateパラメータで確認したいテンプレートを切り替えられる(省略時はLesson 1予約完了メール)。
  const template = request.nextUrl.searchParams.get("template") ?? "booking";
  const sampleName = "山田太郎";
  const sampleInstructor = "FUTURE";

  if (template === "membership") {
    const paymentDeadlineText = formatDateOnly(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const defaultText = buildMembershipInvoiceDefaultText(sampleName, sampleInstructor);
    const { subject, text, html } = buildMembershipInvoiceEmail(
      defaultText,
      sampleInstructor,
      paymentDeadlineText
    );
    await sendMail({ to, subject, text, html });
    return NextResponse.json({ ok: true, message: `${to} に送信しました(ご入会案内メール)。` });
  }

  const email =
    template === "lesson3survey"
      ? buildLesson3SurveyEmail(sampleName)
      : buildBookingConfirmationEmail({
          lessonName: "Lesson 1",
          datetime: new Date("2026-08-15T19:00:00+09:00"),
          instructorName: "佐藤",
          location: "ゲートウェイスタジオ渋谷道玄坂店　3階　5st",
          studentName: sampleName,
        });

  await sendMail({ to, subject: email.subject, text: email.text, html: email.html });

  return NextResponse.json({ ok: true, message: `${to} に送信しました。` });
}
