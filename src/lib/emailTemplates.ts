import { formatLessonDateTime, formatTimeOnly } from "./date";

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
const GATHERING_MINUTES_BEFORE = 10;

/** レッスン開始○分前の集合時刻(JST) */
function gatheringTimeText(datetime: Date): string {
  return formatTimeOnly(new Date(datetime.getTime() - GATHERING_MINUTES_BEFORE * 60 * 1000));
}

function infoText(info: LessonEmailInfo): string {
  const lines = [
    `レッスン: ${info.lessonName}`,
    `日時: ${formatLessonDateTime(info.datetime)}`,
    `講師: ${info.instructorName}`,
  ];
  if (info.location) {
    lines.push(`場所: ${info.location}`);
  }
  return lines.join("\n");
}

function infoHtml(info: LessonEmailInfo): string {
  const locationRow = info.location
    ? `<tr><td style="padding:4px 0;color:#666;">場所</td><td style="padding:4px 0;">${escapeHtml(info.location)}</td></tr>`
    : "";
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:80px;">レッスン</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(info.lessonName)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">日時</td><td style="padding:4px 0;">${escapeHtml(formatLessonDateTime(info.datetime))}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">講師</td><td style="padding:4px 0;">${escapeHtml(info.instructorName)}</td></tr>
      ${locationRow}
    </table>`;
}

function cancelContactEmail(): string {
  return process.env.GMAIL_USER ?? "";
}

function noticeText(datetime: Date): string {
  const gatheringTime = gatheringTimeText(datetime);
  const contactEmail = cancelContactEmail();
  const cancelContactLine = contactEmail
    ? `レッスンをキャンセルする場合はこちらのGmailアドレス（${contactEmail}）にご連絡ください。`
    : "レッスンをキャンセルする場合はこちらのGmailアドレスにご連絡ください。";

  return `【ご案内】
集合: ${gatheringTime}に1階ロビーにお集まりください（開始10分前）
キャンセル: レッスン当日の8日前まで可能です。7日以内のキャンセルはレッスン1回分10,000円を追加請求致します。${cancelContactLine}
持ち物: ヘッドホン（お持ちの方。貸し出しもございます）／Lesson2以降の方はRekordboxをインストールした状態のPC
緊急連絡: 当日の遅刻など緊急のお問い合わせは、担当講師のInstagramアカウントへDMをお願いします。`;
}

function noticeHtml(datetime: Date): string {
  const gatheringTime = gatheringTimeText(datetime);
  const contactEmail = cancelContactEmail();
  const cancelContactHtml = contactEmail
    ? `レッスンをキャンセルする場合はこちらのGmailアドレス（<a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>）にご連絡ください。`
    : "レッスンをキャンセルする場合はこちらのGmailアドレスにご連絡ください。";

  const rows: [string, string][] = [
    ["集合", `${gatheringTime}に1階ロビーにお集まりください（開始10分前）`],
    [
      "キャンセル",
      `レッスン当日の8日前まで可能です。7日以内のキャンセルはレッスン1回分10,000円を追加請求致します。${cancelContactHtml}`,
    ],
    ["持ち物", "ヘッドホン（お持ちの方。貸し出しもございます）／Lesson2以降の方はRekordboxをインストールした状態のPC"],
    ["緊急連絡", "当日の遅刻など緊急のお問い合わせは、担当講師のInstagramアカウントへDMをお願いします。"],
  ];
  const rowsHtml = rows
    .map(([label, value]) => {
      const isHtmlValue = label === "キャンセル";
      return `<tr><td style="padding:6px 0;color:#666;width:80px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top;">${isHtmlValue ? value : escapeHtml(value)}</td></tr>`;
    })
    .join("");

  return `
    <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">ご案内</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rowsHtml}
      </table>
    </div>`;
}

/**
 * 予約完了メール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildBookingConfirmationEmail(info: BookingEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `【${SCHOOL_NAME}】ご予約完了のお知らせ（${info.lessonName}）`;

  const text = `${info.studentName} 様

${SCHOOL_NAME}のご予約が完了しました。
以下の内容でお待ちしております。

${infoText(info)}

${noticeText(info.datetime)}

当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">ご予約が完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}のご予約が完了しました。以下の内容でお待ちしております。</p>
    ${infoHtml(info)}
    ${noticeHtml(info.datetime)}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。ご不明な点がございましたら本メールへご返信ください。</p>
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
  const subject = `【${SCHOOL_NAME}】レッスン開催3日前のリマインド（${info.lessonName}）`;

  const text = `${info.studentName} 様

ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。

${infoText(info)}

${noticeText(info.datetime)}

当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">レッスン開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。</p>
    ${infoHtml(info)}
    ${noticeHtml(info.datetime)}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

export type TrialEmailInfo = {
  datetime: Date;
  instructorName: string;
  studentName: string;
};

/**
 * 体験会 参加登録完了メール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildTrialConfirmationEmail(info: TrialEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const datetimeText = formatLessonDateTime(info.datetime);
  const subject = `【${SCHOOL_NAME}】体験会お申し込み完了のお知らせ`;

  const text = `${info.studentName} 様

${SCHOOL_NAME}の体験会へのお申し込みが完了しました。
以下の内容でお待ちしております。

日時: ${datetimeText}
担当講師: ${info.instructorName}

当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">体験会のお申し込みが完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}の体験会へのお申し込みが完了しました。以下の内容でお待ちしております。</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:80px;">日時</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(datetimeText)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">担当講師</td><td style="padding:4px 0;">${escapeHtml(info.instructorName)}</td></tr>
    </table>
    <p>当日はお気をつけてお越しください。ご不明な点がございましたら本メールへご返信ください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

/**
 * 体験会 開催3日前リマインドメール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildTrialReminderEmail(info: TrialEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const datetimeText = formatLessonDateTime(info.datetime);
  const subject = `【${SCHOOL_NAME}】体験会開催3日前のリマインド`;

  const text = `${info.studentName} 様

お申し込みいただいている${SCHOOL_NAME}の体験会が3日後に迫りましたのでお知らせいたします。

日時: ${datetimeText}
担当講師: ${info.instructorName}

当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">体験会開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>お申し込みいただいている${SCHOOL_NAME}の体験会が3日後に迫りましたのでお知らせいたします。</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#666;width:80px;">日時</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(datetimeText)}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">担当講師</td><td style="padding:4px 0;">${escapeHtml(info.instructorName)}</td></tr>
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
