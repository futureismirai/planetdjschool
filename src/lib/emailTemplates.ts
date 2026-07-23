import { formatLessonDateTime } from "./date";

export type LessonEmailInfo = {
  lessonName: string;
  datetime: Date;
  instructorName: string;
  location?: string | null;
};

export type BookingEmailInfo = LessonEmailInfo & {
  studentName: string;
};

const SCHOOL_NAME = "Planet DJ School";

/**
 * 予約完了メール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildBookingConfirmationEmail(info: BookingEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const datetimeText = formatLessonDateTime(info.datetime);
  const locationLine = info.location ? `会場: ${info.location}\n` : "";
  const locationHtml = info.location
    ? `<tr><td style="padding:4px 0;color:#666;">会場</td><td style="padding:4px 0;">${escapeHtml(info.location)}</td></tr>`
    : "";

  const subject = `【${SCHOOL_NAME}】ご予約完了のお知らせ（${info.lessonName}）`;

  const text = `${info.studentName} 様

${SCHOOL_NAME}のご予約が完了しました。
以下の内容でお待ちしております。

レッスン: ${info.lessonName}
日時: ${datetimeText}
講師: ${info.instructorName}
${locationLine}
当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">ご予約が完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}のご予約が完了しました。以下の内容でお待ちしております。</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:80px;">レッスン</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(info.lessonName)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">日時</td><td style="padding:4px 0;">${escapeHtml(datetimeText)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">講師</td><td style="padding:4px 0;">${escapeHtml(info.instructorName)}</td></tr>
      ${locationHtml}
    </table>
    <p>当日はお気をつけてお越しください。ご不明な点がございましたら本メールへご返信ください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

/**
 * 開催3日前リマインドメール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildReminderEmail(info: BookingEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const datetimeText = formatLessonDateTime(info.datetime);
  const locationLine = info.location ? `会場: ${info.location}\n` : "";
  const locationHtml = info.location
    ? `<tr><td style="padding:4px 0;color:#666;">会場</td><td style="padding:4px 0;">${escapeHtml(info.location)}</td></tr>`
    : "";

  const subject = `【${SCHOOL_NAME}】レッスン開催3日前のリマインド（${info.lessonName}）`;

  const text = `${info.studentName} 様

ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。

レッスン: ${info.lessonName}
日時: ${datetimeText}
講師: ${info.instructorName}
${locationLine}
当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">レッスン開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:80px;">レッスン</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(info.lessonName)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">日時</td><td style="padding:4px 0;">${escapeHtml(datetimeText)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">講師</td><td style="padding:4px 0;">${escapeHtml(info.instructorName)}</td></tr>
      ${locationHtml}
    </table>
    <p>当日はお気をつけてお越しください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
