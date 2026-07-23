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
