/** レッスン・体験会・個別レッスンの場所欄が未入力の場合に使う既定値。 */
export const DEFAULT_LOCATION = "ゲートウェイスタジオ渋谷道玄坂店　3階　5st";

/** グループレッスン・個別レッスン・体験会の枠作成フォームで選べる講師名の選択肢。 */
export const INSTRUCTOR_NAME_OPTIONS = [
  "FUTURE",
  "Ryuga Nomoto",
  "Erykah",
  "tuzuRa",
  "wargh",
  "Kuri Vodka",
  "未定",
];

/** 個別レッスン1回あたりの所要時間(分)。メールの終了時刻表示や日程調整での候補選択に使用する。 */
export const INDIVIDUAL_LESSON_DURATION_MINUTES = 120; // 2時間

/** イベント出演の参加可否の選択肢。公開回答ページ・管理画面(デビューイベント)の両方で使用する。 */
export const EVENT_PARTICIPATION_OPTIONS = [
  { value: "participating", label: "参加できる" },
  { value: "declined", label: "参加できない" },
  { value: "not_interested", label: "参加を希望しない" },
] as const;

export type EventParticipationValue = (typeof EVENT_PARTICIPATION_OPTIONS)[number]["value"];

export function eventParticipationLabel(value: string): string {
  return EVENT_PARTICIPATION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** 受講後アンケートの連絡方法設問の選択肢文言。フォームの条件分岐表示・入力必須判定の両方で使う。 */
export const INSTAGRAM_SHARE_LABEL = "Instagramを教える";
export const INSTAGRAM_DECLINE_LABEL = "引き続きメールでの連絡を希望する";

/**
 * 受講後アンケートの質問一覧。イベント出演案内メールの回答ページ(/event-response/[token])と
 * 管理画面の「受講後アンケート」ページの両方で、この定義を共通の表示元として使用する。
 */
export const SURVEY_QUESTIONS = [
  {
    key: "djName" as const,
    question: "デビューする時のDJネームを教えて下さい",
    type: "text" as const,
    required: true,
  },
  {
    key: "joinStatus" as const,
    question: "入会した時の状況を教えてください",
    type: "choice" as const,
    required: true,
    options: [
      "全くの初心者",
      "少し機材を触ったことがあった（ミックスはできない）",
      "ミックスはできるが現場に出たことはなかった",
      "現場に出たことがあった",
    ],
  },
  {
    key: "lessonSufficiency" as const,
    question: "レッスン内容は3回で十分でしたか？",
    type: "choice" as const,
    required: true,
    options: [
      "自信を持ってDJデビューできそう",
      "自信はあまりないけどなんとかなりそう",
      "自信はまったくないけどがんばります",
      "3回じゃ全然足りませんでした",
    ],
  },
  {
    key: "moreToLearn" as const,
    question: "3回のレッスン以外でもっと学びたかった内容はありましたか",
    type: "textarea" as const,
    required: false,
  },
  {
    key: "wantsMoreLessons" as const,
    question: "デビュー後のレッスンを希望しますか？",
    note: "こちらの選択により、レッスンが確定するわけではございません",
    type: "choice" as const,
    required: true,
    options: ["はい", "いいえ", "検討中"],
  },
  {
    key: "improvements" as const,
    question: "レッスン内容や運営に関して改善点や希望する事があれば記入下さい",
    type: "textarea" as const,
    required: false,
  },
  {
    key: "message" as const,
    question: "最後に講師やスタッフの方に応援メッセージなどがあればご記入下さい！",
    type: "textarea" as const,
    required: false,
  },
  {
    key: "contactPreference" as const,
    question:
      "当日の会場情報の共有や、万が一の日程変更などをリアルタイムでお伝えしたいため、Instagramのアカウントを教えていただくことは可能ですか？",
    note: "教えたくない方は「引き続きメールでの連絡を希望する」をお選びください。その場合もこれまで通りメールでご連絡します。",
    type: "choice" as const,
    required: true,
    options: [INSTAGRAM_SHARE_LABEL, INSTAGRAM_DECLINE_LABEL],
  },
  {
    key: "instagramHandle" as const,
    question: "Instagramのアカウントを教えてください",
    type: "text" as const,
    // 上の質問で「Instagramを教える」を選んだ場合のみ表示・必須にする(フォーム側で制御)。
    required: false,
  },
];

export type SurveyAnswers = {
  djName: string;
  joinStatus: string;
  lessonSufficiency: string;
  moreToLearn: string;
  wantsMoreLessons: string;
  improvements: string;
  message: string;
  contactPreference: string;
  instagramHandle: string;
};
