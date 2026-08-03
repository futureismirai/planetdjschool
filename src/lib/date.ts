import { addDays, format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";

const TIME_ZONE = "Asia/Tokyo";

/** 例: 2026年7月26日(日) 19:00 */
export function formatLessonDateTime(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "yyyy年M月d日(E) HH:mm", { locale: ja });
}

export function formatDateOnly(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "yyyy年M月d日(E)", { locale: ja });
}

/** 例: 7月26日(日) - 一覧の日付見出し用（年なし） */
export function formatDateHeading(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "M月d日(E)", { locale: ja });
}

/** 例: 19:00 */
export function formatTimeOnly(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "HH:mm", { locale: ja });
}

/** 日本時間での日付キー(yyyy-MM-dd)。同一日のレッスンをグループ化する際に使用する。 */
export function getJstDateKey(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "yyyy-MM-dd");
}

/**
 * 管理画面の一覧表示用に並べ替える。日付は新しい順(降順)、同じ日の中では
 * 開始時刻が早い順(昇順)になる。
 */
export function sortForDateGroupedDisplay<T>(items: T[], getDatetime: (item: T) => Date): T[] {
  return [...items].sort((a, b) => {
    const aKey = getJstDateKey(getDatetime(a));
    const bKey = getJstDateKey(getDatetime(b));
    if (aKey !== bKey) return aKey < bKey ? 1 : -1;
    return getDatetime(a).getTime() - getDatetime(b).getTime();
  });
}

/**
 * 日時順(基本的に降順/昇順どちらでも可)に並んだ一覧に対して、日付が切り替わった要素に
 * isNewDate=true を付与する。管理画面の一覧で日付ごとの区切りを表示する際に使用する。
 */
export function withDateGroupFlags<T>(
  items: T[],
  getDatetime: (item: T) => Date
): { item: T; dateKey: string; isNewDate: boolean }[] {
  let lastKey: string | null = null;
  return items.map((item) => {
    const dateKey = getJstDateKey(getDatetime(item));
    const isNewDate = dateKey !== lastKey;
    lastKey = dateKey;
    return { item, dateKey, isNewDate };
  });
}

/** 現在の日本時間の年・月(月は1〜12)を返す。カレンダーの初期表示に使用する。 */
export function getJstNowYearMonth(now: Date = new Date()): { year: number; month: number } {
  const [year, month] = formatInTimeZone(now, TIME_ZONE, "yyyy-M").split("-").map(Number);
  return { year, month };
}

/**
 * 指定した日本時間の年月(1日00:00〜翌月1日00:00)のUTC範囲を返す。
 * カレンダー表示に使用する。
 */
export function getJstMonthRange(year: number, month: number): { start: Date; end: Date } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    start: fromZonedTime(`${year}-${pad(month)}-01 00:00:00`, TIME_ZONE),
    end: fromZonedTime(`${nextYear}-${pad(nextMonth)}-01 00:00:00`, TIME_ZONE),
  };
}

/**
 * 日本時間で「今日からdaysFromNow日後」の1日分(00:00〜翌日00:00)のUTC範囲を返す。
 * リマインドメール送信対象日の判定に使用する。
 */
export function getJstDayWindow(
  daysFromNow: number,
  now: Date = new Date()
): { start: Date; end: Date } {
  const todayJstStr = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const todayAsUtcMidnight = new Date(`${todayJstStr}T00:00:00Z`);
  const targetDay = addDays(todayAsUtcMidnight, daysFromNow);
  const targetDayStr = format(targetDay, "yyyy-MM-dd");
  const nextDayStr = format(addDays(targetDay, 1), "yyyy-MM-dd");

  return {
    start: fromZonedTime(`${targetDayStr} 00:00:00`, TIME_ZONE),
    end: fromZonedTime(`${nextDayStr} 00:00:00`, TIME_ZONE),
  };
}
