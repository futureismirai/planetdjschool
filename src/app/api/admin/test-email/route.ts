import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { buildBookingConfirmationEmail, buildLesson3SurveyEmail } from "@/lib/emailTemplates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.nextUrl.searchParams.get("secret") === secret;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 入会案内メールの検討用サンプルデータ・文面(テスト送信用、デザイン検討のための一時的なコード)。
const MEMBERSHIP_BOOKING_URL = "https://planetdjschool.vercel.app";

function buildMembershipFreeText(studentName: string, instructorName: string): string {
  return `${studentName} 様

この度はPlanet DJ Schoolへのご入会、誠にありがとうございます。講師の${instructorName}です。



（ここに自由記載が入ります）



以下のプランと振込先のご案内です。ご確認のうえ、お振込みをお願いいたします。`;
}

function buildMembershipPlainTail(instructorName: string): string {
  return `【プラン比較】

■レッスン
ノーマル: 1.5h×3回　／　プレミアム: 2h×3回

■形式
ノーマル: グループ　／　プレミアム: マンツーマン

■開催日
ノーマル: 月2回の開催日に予約
　　※予約サイト: ${MEMBERSHIP_BOOKING_URL}
プレミアム: いつでもOK（講師と都合が合う日程）

■おすすめな人
ノーマル:
・ご自宅で少し練習している方、他のスクールで学んだ学び直しの方に最適
・初心者の方でも十分デビュー可能です（実績あり）

プレミアム:
・一対一でしっかり学びたい方
・お仕事等で都合が合わない方

■内容(共通)
Lesson 1-3 + デビュー

■料金
ノーマル: ￥30,000　／　プレミアム: ￥50,000

【お振込み先】
ドコモSMTBネット銀行（金融機関コード0038）
キウイ支店（支店コード109）
普通 7938647
佐野 実来（サノ ミライ）

ご不明な点がございましたらお気軽にご返信ください。

${instructorName}`;
}

function buildMembershipDropdownHtml(freeText: string, instructorName: string): string {
  return `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <div style="white-space:pre-wrap;">${escapeHtml(freeText)}</div>

    <p style="font-weight:bold;margin:20px 0 10px;color:#0f172a;">プランのご案内</p>

    <details open style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
      <summary style="font-weight:bold;cursor:pointer;color:#0f172a;">◯ノーマルプラン（最も選ばれています）</summary>
      <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:14px;">
        <tr><td style="padding:4px 0;color:#666;width:90px;vertical-align:top;">レッスン</td><td style="padding:4px 0;">1.5h×3回</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">形式</td><td style="padding:4px 0;">グループ</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">開催日</td><td style="padding:4px 0;">月2回の開催日に予約<br><span style="font-size:12px;color:#666;">※予約サイト: <a href="${escapeHtml(MEMBERSHIP_BOOKING_URL)}">${escapeHtml(MEMBERSHIP_BOOKING_URL)}</a></span></td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">おすすめ</td><td style="padding:4px 0;">・ご自宅で少し練習している方、他のスクールで学んだ学び直しの方に最適<br>・初心者の方でも十分デビュー可能です（実績あり）</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">内容</td><td style="padding:4px 0;">Lesson 1-3 + デビュー</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">料金</td><td style="padding:4px 0;font-weight:bold;">￥30,000</td></tr>
      </table>
    </details>

    <details style="margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;">
      <summary style="font-weight:bold;cursor:pointer;color:#0f172a;">◯プレミアムプラン</summary>
      <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:14px;">
        <tr><td style="padding:4px 0;color:#666;width:90px;vertical-align:top;">レッスン</td><td style="padding:4px 0;">2h×3回</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">形式</td><td style="padding:4px 0;">マンツーマン</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">開催日</td><td style="padding:4px 0;">いつでもOK（講師と都合が合う日程）</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">おすすめ</td><td style="padding:4px 0;">・一対一でしっかり学びたい方<br>・お仕事等で都合が合わない方</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">内容</td><td style="padding:4px 0;">Lesson 1-3 + デビュー</td></tr>
        <tr><td style="padding:4px 0;color:#666;vertical-align:top;">料金</td><td style="padding:4px 0;font-weight:bold;">￥50,000</td></tr>
      </table>
    </details>

    <div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">お振込み先</p>
      <p style="margin:0;font-size:14px;line-height:1.8;">
        ドコモSMTBネット銀行（金融機関コード0038）<br>
        キウイ支店（支店コード109）<br>
        普通 7938647<br>
        佐野 実来（サノ ミライ）
      </p>
    </div>

    <p style="margin-top:20px;">ご不明な点がございましたらお気軽にご返信ください。</p>
    <p style="color:#666;margin-top:24px;">${escapeHtml(instructorName)}</p>
  </div>`;
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

  if (template === "membership-dropdown") {
    const freeText = buildMembershipFreeText(sampleName, sampleInstructor);
    const tail = buildMembershipPlainTail(sampleInstructor);
    const text = `${freeText}\n\n${tail}`;
    const html = buildMembershipDropdownHtml(freeText, sampleInstructor);
    await sendMail({ to, subject: "【Planet DJ School】ご入会のお礼とお振込みのご案内(プルダウン版)", text, html });
    return NextResponse.json({ ok: true, message: `${to} に送信しました(プルダウン版)。` });
  }

  if (template === "membership-plain") {
    const freeText = buildMembershipFreeText(sampleName, sampleInstructor);
    const tail = buildMembershipPlainTail(sampleInstructor);
    const text = `${freeText}\n\n${tail}`;
    await sendMail({ to, subject: "【Planet DJ School】ご入会のお礼とお振込みのご案内(プレーンテキスト版)", text });
    return NextResponse.json({ ok: true, message: `${to} に送信しました(プレーンテキスト版)。` });
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
