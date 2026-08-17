import { formatLessonDateTime, formatTimeOnly } from "./date";

const SCHOOL_NAME = "Planet DJ School";
const GATHERING_MINUTES_BEFORE = 10;

// レッスン種別ごとの所要時間(終了時刻の表示に使用)
const GROUP_LESSON_DURATION_MINUTES = 90; // 1.5時間
const TRIAL_DURATION_MINUTES = 60; // 1時間
const INDIVIDUAL_LESSON_DURATION_MINUTES = 120; // 2時間

/** 開始〜終了の日時表記。例: 2026年8月15日(土) 19:00〜20:30 */
function formatDateTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return `${formatLessonDateTime(start)}〜${formatTimeOnly(end)}`;
}

/** レッスン開始○分前の集合時刻(JST) */
function gatheringTimeText(datetime: Date): string {
  return formatTimeOnly(new Date(datetime.getTime() - GATHERING_MINUTES_BEFORE * 60 * 1000));
}

function cancelContactEmail(): string {
  return process.env.GMAIL_USER ?? "";
}

type InfoRow = { label: string; value: string };

function buildInfoRows(rows: InfoRow[]): { text: string; html: string } {
  const text = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
  const html = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      ${rows
        .map(
          (row, i) =>
            `<tr><td style="padding:4px 0;color:#666;${i === 0 ? "width:80px;" : ""}">${escapeHtml(row.label)}</td><td style="padding:4px 0;${i === 0 ? "font-weight:bold;" : ""}">${escapeHtml(row.value)}</td></tr>`
        )
        .join("")}
    </table>`;
  return { text, html };
}

/**
 * 「ご案内」ブロック(集合・キャンセル・持ち物・緊急連絡)。
 * cancelFeeYen が null の場合はキャンセル料の記載を省略する(体験会向け)。
 * participationFee を指定すると「参加費」の行を追加する(体験会向け)。
 * includeRekordboxNote を true にすると、持ち物にRekordboxの案内を追加する
 * (グループレッスン・個別レッスン向け。体験会には含めない)。
 * 文面を変更したい場合はこの関数を編集してください。
 */
function buildNoticeSection(
  datetime: Date,
  cancelFeeYen: number | null,
  participationFee?: string,
  includeRekordboxNote?: boolean
): { text: string; html: string } {
  const gatheringTime = gatheringTimeText(datetime);
  const contactEmail = cancelContactEmail();
  const contactSentence = contactEmail
    ? `レッスンをキャンセルする場合はこちらのGmailアドレス（${contactEmail}）にご連絡ください。`
    : "レッスンをキャンセルする場合はこちらのGmailアドレスにご連絡ください。";
  const contactSentenceHtml = contactEmail
    ? `レッスンをキャンセルする場合はこちらのGmailアドレス（<a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>）にご連絡ください。`
    : "レッスンをキャンセルする場合はこちらのGmailアドレスにご連絡ください。";
  const feeSentence =
    cancelFeeYen != null
      ? `7日以内のキャンセルはレッスン1回分${cancelFeeYen.toLocaleString()}円を追加請求致します。`
      : "";
  const belongingsText = includeRekordboxNote
    ? "ヘッドホン（お持ちの方。貸し出しもございます）／Lesson 2以降の方はRekordboxをインストールした状態のPC"
    : "ヘッドホン（お持ちの方。貸し出しもございます）";

  const rows: { label: string; text: string; html: string }[] = [
    {
      label: "集合",
      text: `${gatheringTime}に1階ロビーにお集まりください（開始10分前）`,
      html: escapeHtml(`${gatheringTime}に1階ロビーにお集まりください（開始10分前）`),
    },
  ];

  if (participationFee) {
    rows.push({
      label: "参加費",
      text: participationFee,
      html: escapeHtml(participationFee),
    });
  }

  rows.push(
    {
      label: "キャンセル",
      text: `レッスン当日の8日前まで可能です。${feeSentence}${contactSentence}`,
      html: `レッスン当日の8日前まで可能です。${escapeHtml(feeSentence)}${contactSentenceHtml}`,
    },
    {
      label: "持ち物",
      text: belongingsText,
      html: escapeHtml(belongingsText),
    },
    {
      label: "緊急連絡",
      text: "当日の遅刻など緊急のお問い合わせは、担当講師のInstagramアカウントへDMをお願いします。",
      html: escapeHtml("当日の遅刻など緊急のお問い合わせは、担当講師のInstagramアカウントへDMをお願いします。"),
    }
  );

  const text = `【ご案内】\n${rows.map((r) => `${r.label}: ${r.text}`).join("\n")}`;
  const html = `
    <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">ご案内</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${rows.map((r) => `<tr><td style="padding:6px 0;color:#666;width:80px;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:6px 0;vertical-align:top;">${r.html}</td></tr>`).join("")}
      </table>
    </div>`;

  return { text, html };
}

/**
 * Lesson 1登録時の予約完了メールにのみ追加する資料案内ブロック(3日前リマインドには含めない)。
 * 文面・リンクを変更したい場合はこの関数を編集してください。
 */
function buildLesson1MaterialsSection(): { text: string; html: string } {
  const text = `◯ レッスン資料

Lesson 1
https://drive.google.com/drive/folders/1byKYl8QwscqNNb5do5ZRACXuNyjU3DLt

Lesson 2
https://drive.google.com/drive/folders/1p4ctRcHqAH6dEfH6RbuvNSIGIn3r9reo

Lesson 3
https://drive.google.com/file/d/1ZW28MgIoSpfo7GBGjECfTjDnUQ7JjZVt/view?usp=drivesdk

◯ レッスンに関する資料
こちらは必ずお読み下さい。
https://www.notion.so/3735fe86c92a8063825ffc77f552bc95?source=copy_link

◯ 準備するもの（参考）
【これからDJを始める方へ】DJに必要なもの3選
https://note.com/ginza_member/n/n70d18564b1ef`;

  const html = `
    <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="font-weight:bold;margin:0 0 8px;color:#0f172a;">レッスン資料</p>
      <p style="margin:0 0 8px;">Lesson 1<br><a href="https://drive.google.com/drive/folders/1byKYl8QwscqNNb5do5ZRACXuNyjU3DLt">https://drive.google.com/drive/folders/1byKYl8QwscqNNb5do5ZRACXuNyjU3DLt</a></p>
      <p style="margin:0 0 8px;">Lesson 2<br><a href="https://drive.google.com/drive/folders/1p4ctRcHqAH6dEfH6RbuvNSIGIn3r9reo">https://drive.google.com/drive/folders/1p4ctRcHqAH6dEfH6RbuvNSIGIn3r9reo</a></p>
      <p style="margin:0 0 16px;">Lesson 3<br><a href="https://drive.google.com/file/d/1ZW28MgIoSpfo7GBGjECfTjDnUQ7JjZVt/view?usp=drivesdk">https://drive.google.com/file/d/1ZW28MgIoSpfo7GBGjECfTjDnUQ7JjZVt/view?usp=drivesdk</a></p>
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">レッスンに関する資料</p>
      <p style="margin:0 0 4px;">こちらは必ずお読み下さい。</p>
      <p style="margin:0 0 16px;"><a href="https://www.notion.so/3735fe86c92a8063825ffc77f552bc95?source=copy_link">https://www.notion.so/3735fe86c92a8063825ffc77f552bc95?source=copy_link</a></p>
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">準備するもの（参考）</p>
      <p style="margin:0 0 4px;">【これからDJを始める方へ】DJに必要なもの3選</p>
      <p style="margin:0;"><a href="https://note.com/ginza_member/n/n70d18564b1ef">https://note.com/ginza_member/n/n70d18564b1ef</a></p>
    </div>`;

  return { text, html };
}

export type LessonEmailInfo = {
  lessonName: string;
  datetime: Date;
  instructorName: string;
  location?: string | null;
};

export type BookingEmailInfo = LessonEmailInfo & {
  studentName: string;
};

function groupLessonInfo(info: LessonEmailInfo) {
  const rows: InfoRow[] = [
    { label: "レッスン", value: info.lessonName },
    { label: "日時", value: formatDateTimeRange(info.datetime, GROUP_LESSON_DURATION_MINUTES) },
    { label: "講師", value: info.instructorName },
  ];
  if (info.location) {
    rows.push({ label: "場所", value: info.location });
  }
  return buildInfoRows(rows);
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
  const groupInfo = groupLessonInfo(info);
  const notice = buildNoticeSection(info.datetime, 10000, undefined, true);
  const materials = info.lessonName === "Lesson 1" ? buildLesson1MaterialsSection() : null;

  const text = `${info.studentName} 様

${SCHOOL_NAME}のご予約が完了しました。
以下の内容でお待ちしております。

${groupInfo.text}

${notice.text}${materials ? `\n\n${materials.text}` : ""}

当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">ご予約が完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}のご予約が完了しました。以下の内容でお待ちしております。</p>
    ${groupInfo.html}
    ${notice.html}
    ${materials ? materials.html : ""}
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
  const groupInfo = groupLessonInfo(info);
  const notice = buildNoticeSection(info.datetime, 10000, undefined, true);

  const text = `${info.studentName} 様

ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。

${groupInfo.text}

${notice.text}

当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">レッスン開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>ご予約いただいている${SCHOOL_NAME}のレッスンが3日後に迫りましたのでお知らせいたします。</p>
    ${groupInfo.html}
    ${notice.html}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

export type TrialEmailInfo = {
  datetime: Date;
  instructorName: string;
  studentName: string;
  location?: string | null;
};

function trialInfo(info: TrialEmailInfo) {
  const rows: InfoRow[] = [
    { label: "日時", value: formatDateTimeRange(info.datetime, TRIAL_DURATION_MINUTES) },
    { label: "担当講師", value: info.instructorName },
  ];
  if (info.location) {
    rows.push({ label: "場所", value: info.location });
  }
  return buildInfoRows(rows);
}

/**
 * 体験会 参加登録完了メール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildTrialConfirmationEmail(info: TrialEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `【${SCHOOL_NAME}】体験会お申し込み完了のお知らせ`;
  const trial = trialInfo(info);
  const notice = buildNoticeSection(info.datetime, null, "3,000円（現金のみ）");

  const text = `${info.studentName} 様

${SCHOOL_NAME}の体験会へのお申し込みが完了しました。
以下の内容でお待ちしております。

${trial.text}

${notice.text}

当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">体験会のお申し込みが完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}の体験会へのお申し込みが完了しました。以下の内容でお待ちしております。</p>
    ${trial.html}
    ${notice.html}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。ご不明な点がございましたら本メールへご返信ください。</p>
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
  const subject = `【${SCHOOL_NAME}】体験会開催3日前のリマインド`;
  const trial = trialInfo(info);
  const notice = buildNoticeSection(info.datetime, null, "3,000円（現金のみ）");

  const text = `${info.studentName} 様

お申し込みいただいている${SCHOOL_NAME}の体験会が3日後に迫りましたのでお知らせいたします。

${trial.text}

${notice.text}

当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">体験会開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>お申し込みいただいている${SCHOOL_NAME}の体験会が3日後に迫りましたのでお知らせいたします。</p>
    ${trial.html}
    ${notice.html}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

export type IndividualLessonEmailInfo = {
  lessonName: string;
  datetime: Date;
  instructorName: string;
  studentName: string;
  location?: string | null;
};

function individualLessonInfo(info: IndividualLessonEmailInfo) {
  const rows: InfoRow[] = [
    { label: "レッスン", value: info.lessonName },
    { label: "日時", value: formatDateTimeRange(info.datetime, INDIVIDUAL_LESSON_DURATION_MINUTES) },
    { label: "講師", value: info.instructorName },
  ];
  if (info.location) {
    rows.push({ label: "場所", value: info.location });
  }
  return buildInfoRows(rows);
}

/**
 * 個別レッスン 予約完了メール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildIndividualLessonConfirmationEmail(info: IndividualLessonEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `【${SCHOOL_NAME}】個別レッスンのご予約完了のお知らせ（${info.lessonName}）`;
  const individual = individualLessonInfo(info);
  const notice = buildNoticeSection(info.datetime, 15000, undefined, true);
  const materials = info.lessonName === "Lesson 1" ? buildLesson1MaterialsSection() : null;

  const text = `${info.studentName} 様

${SCHOOL_NAME}の個別レッスンのご予約が完了しました。
以下の内容でお待ちしております。

${individual.text}

${notice.text}${materials ? `\n\n${materials.text}` : ""}

当日はお気をつけてお越しください。
ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">個別レッスンのご予約が完了しました</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}の個別レッスンのご予約が完了しました。以下の内容でお待ちしております。</p>
    ${individual.html}
    ${notice.html}
    ${materials ? materials.html : ""}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。ご不明な点がございましたら本メールへご返信ください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

/**
 * 個別レッスン 開催3日前リマインドメール。文面を変更したい場合はこの関数を編集してください。
 */
export function buildIndividualLessonReminderEmail(info: IndividualLessonEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `【${SCHOOL_NAME}】個別レッスン開催3日前のリマインド（${info.lessonName}）`;
  const individual = individualLessonInfo(info);
  const notice = buildNoticeSection(info.datetime, 15000, undefined, true);

  const text = `${info.studentName} 様

ご予約いただいている${SCHOOL_NAME}の個別レッスンが3日後に迫りましたのでお知らせいたします。

${individual.text}

${notice.text}

当日はお気をつけてお越しください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">個別レッスン開催3日前のお知らせ</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>ご予約いただいている${SCHOOL_NAME}の個別レッスンが3日後に迫りましたのでお知らせいたします。</p>
    ${individual.html}
    ${notice.html}
    <p style="margin-top:20px;">当日はお気をつけてお越しください。</p>
    <p style="color:#666;margin-top:24px;">${SCHOOL_NAME}</p>
  </div>`;

  return { subject, text, html };
}

export type NextLessonInviteEmailInfo = {
  studentName: string;
  currentLessonName: string;
  nextLessonName: string;
  nextLessonDatetime: Date;
  nextLessonHasNoBookings: boolean;
};

function bookingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://planetdjschool.vercel.app";
}

/**
 * グループレッスン終了者へ次のレッスンの受講を促す案内メール。
 * 管理者が「グループレッスン」画面から手動で送信する(自動送信ではない)。
 * 文面を変更したい場合はこの関数を編集してください。
 */
export function buildNextLessonInviteEmail(info: NextLessonInviteEmailInfo): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `【${SCHOOL_NAME}】${info.nextLessonName}のご案内`;
  const dateTimeText = formatDateTimeRange(info.nextLessonDatetime, GROUP_LESSON_DURATION_MINUTES);
  const url = bookingSiteUrl();

  const scheduleNoteText = info.nextLessonHasNoBookings
    ? "\n※現在このレッスンへのご予約がまだ入っていないため、開催日時が予告なく変更になる場合があります。"
    : "";
  const scheduleNoteHtml = info.nextLessonHasNoBookings
    ? `<p style="margin:8px 0 0;color:#b45309;font-size:13px;">※現在このレッスンへのご予約がまだ入っていないため、開催日時が予告なく変更になる場合があります。</p>`
    : "";

  const text = `${info.studentName} 様

${SCHOOL_NAME}の${info.currentLessonName}をご受講いただきありがとうございました。
着実にステップアップしていただくために、続けて${info.nextLessonName}の受講をおすすめしております。

【次回レッスンのご案内】
レッスン: ${info.nextLessonName}
日時: ${dateTimeText}${scheduleNoteText}

ぜひこの機会にご予約ください。

▼ご予約はこちら
${url}

ご不明な点がございましたら本メールへご返信ください。

${SCHOOL_NAME}`;

  const html = `
  <div style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:480px;margin:0 auto;color:#222;">
    <h2 style="color:#0f172a;">${escapeHtml(info.nextLessonName)}のご案内</h2>
    <p>${escapeHtml(info.studentName)} 様</p>
    <p>${SCHOOL_NAME}の${escapeHtml(info.currentLessonName)}をご受講いただきありがとうございました。<br>
    着実にステップアップしていただくために、続けて${escapeHtml(info.nextLessonName)}の受講をおすすめしております。</p>
    <div style="margin-top:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;">
      <p style="font-weight:bold;margin:0 0 4px;color:#0f172a;">次回レッスンのご案内</p>
      <table style="width:100%;border-collapse:collapse;margin:0;">
        <tr><td style="padding:4px 0;color:#666;width:80px;">レッスン</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(info.nextLessonName)}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">日時</td><td style="padding:4px 0;">${escapeHtml(dateTimeText)}</td></tr>
      </table>
      ${scheduleNoteHtml}
    </div>
    <p style="margin-top:20px;">ぜひこの機会にご予約ください。</p>
    <p style="margin-top:16px;text-align:center;">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:bold;">ご予約はこちら</a>
    </p>
    <p style="margin-top:20px;">ご不明な点がございましたら本メールへご返信ください。</p>
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
