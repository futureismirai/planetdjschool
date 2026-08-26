// イベントオーガナイザーツール: タイムテーブル自動作成ロジック
// 時刻はすべて "HH:mm" 形式の文字列で扱う（日をまたぐ深夜イベントも考慮）

export type RoundingMode = "none" | "5min" | "10min";

export type PerformerInput = {
  name: string;
  snsHandle?: string;
  /** この出演者の出演時間を分単位で固定したい場合に指定する（例: 30分固定） */
  fixedDurationMinutes?: number;
};

export type GeneratedSlot = {
  name: string;
  snsHandle?: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toMinutes(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) throw new Error(`時刻の形式が正しくありません: ${hhmm}`);
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

/**
 * 開始時刻を基準に、終了時刻が開始時刻以前なら日をまたぐものとして
 * 1440分を加算した「連続した分」に変換する。
 */
function resolveEndAfterStart(startMin: number, endMin: number): number {
  return endMin <= startMin ? endMin + 1440 : endMin;
}

/** 出演開始・終了時刻(HH:mm)から出演時間(分)を求める。日をまたぐ場合も考慮する。 */
export function slotDurationMinutes(startTime: string, endTime: string): number {
  const startMin = toMinutes(startTime);
  const endMin = resolveEndAfterStart(startMin, toMinutes(endTime));
  return endMin - startMin;
}

type Span = { startMin: number; endMin: number };

/**
 * 指定した区間 [start, end) を count 個に分割する。
 * rounding が指定されている場合は境界を5分/10分単位に丸め、
 * ほぼ均等になるようにしつつ最後の枠で端数を吸収する。
 * 丸めによって出演時間に差が出る場合は、短い時間を前半に、
 * 長い時間を後半に配置する。
 */
function splitEvenly(start: number, end: number, count: number, rounding: RoundingMode): Span[] {
  if (count <= 0) return [];
  const each = (end - start) / count;
  const boundaries: number[] = [start];
  for (let i = 1; i < count; i++) {
    boundaries.push(start + each * i);
  }
  boundaries.push(end);

  if (rounding !== "none") {
    const unit = rounding === "5min" ? 5 : 10;
    for (let i = 1; i < boundaries.length - 1; i++) {
      let rounded = Math.round(boundaries[i] / unit) * unit;
      if (rounded <= boundaries[i - 1]) rounded = boundaries[i - 1] + unit;
      boundaries[i] = rounded;
    }
    // 最後の境界は必ず区間の終了時刻に一致させる（丸めによる端数は最終枠が吸収する）
    if (boundaries[boundaries.length - 1] < boundaries[boundaries.length - 2]) {
      boundaries[boundaries.length - 1] = boundaries[boundaries.length - 2];
    }
  }

  const durations: number[] = [];
  for (let i = 0; i < count; i++) {
    durations.push(boundaries[i + 1] - boundaries[i]);
  }
  durations.sort((a, b) => a - b);

  const result: Span[] = [];
  let cursor = start;
  for (let i = 0; i < count; i++) {
    const next = cursor + durations[i];
    result.push({ startMin: cursor, endMin: next });
    cursor = next;
  }
  return result;
}

/**
 * 出演者リストとフロアの開始・終了時刻から、タイムテーブルを自動作成する。
 * - デフォルトは均等割り
 * - rounding で5分/10分単位のほぼ均等な区切りに変更可能
 * - fixedDurationMinutes が指定された出演者は、出演順のその位置でその分数だけ
 *   固定の出演時間を確保する。残りの出演者は、残った時間全体を均等に分け合う
 *   （固定出演者を挟んでいても、全体としてほぼ均等になるように配分する）
 */
export function generateTimetable(
  performers: PerformerInput[],
  floorStart: string,
  floorEnd: string,
  rounding: RoundingMode = "none"
): GeneratedSlot[] {
  if (performers.length === 0) return [];

  const startMin = toMinutes(floorStart);
  const endMin = resolveEndAfterStart(startMin, toMinutes(floorEnd));
  const totalMinutes = endMin - startMin;
  if (totalMinutes <= 0) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  const fixedDurations = performers.map((p) =>
    p.fixedDurationMinutes && p.fixedDurationMinutes > 0 ? Math.round(p.fixedDurationMinutes) : null
  );
  const totalFixedMinutes = fixedDurations.reduce((sum: number, d) => sum + (d ?? 0), 0);
  const nonFixedCount = fixedDurations.filter((d) => d === null).length;
  const remainingMinutes = totalMinutes - totalFixedMinutes;

  if (nonFixedCount > 0 && remainingMinutes <= 0) {
    throw new Error("固定した出演時間の合計がフロアの時間を超えています。");
  }

  // 固定されていない出演者全員分の持ち時間を、全体でほぼ均等になるようあらかじめ計算しておく
  const nonFixedSpans =
    nonFixedCount > 0 ? splitEvenly(0, remainingMinutes, nonFixedCount, rounding) : [];

  const results: GeneratedSlot[] = [];
  let cursor = startMin;
  let nonFixedIndex = 0;

  performers.forEach((p, i) => {
    const fixedDuration = fixedDurations[i];
    let duration: number;
    if (fixedDuration !== null) {
      duration = fixedDuration;
    } else {
      const span = nonFixedSpans[nonFixedIndex];
      duration = span.endMin - span.startMin;
      nonFixedIndex++;
    }
    const start = cursor;
    const end = cursor + duration;
    results.push({
      name: p.name,
      snsHandle: p.snsHandle,
      startTime: toHHMM(start),
      endTime: toHHMM(end),
      isFixed: fixedDuration !== null,
    });
    cursor = end;
  });

  return results;
}

export type SnsFormatOptions = {
  includeStartTime: boolean;
  includeEndTime: boolean;
  includeSns: boolean;
  /** SNSアカウント名を "(@handle)" のようにカッコで囲むかどうか */
  snsParentheses: boolean;
};

export const DEFAULT_SNS_FORMAT_OPTIONS: SnsFormatOptions = {
  includeStartTime: true,
  includeEndTime: true,
  includeSns: true,
  snsParentheses: true,
};

/** タイムテーブルをSNSにそのまま貼り付けられるテキスト形式に変換する */
export function formatTimetableForSns(
  titleLines: string[],
  slots: { performerName: string; snsHandle: string | null; startTime: string; endTime: string }[],
  options: SnsFormatOptions = DEFAULT_SNS_FORMAT_OPTIONS
): string {
  const lines = [...titleLines, ""];
  for (const slot of slots) {
    const parts: string[] = [];
    if (options.includeStartTime && options.includeEndTime) {
      parts.push(`${slot.startTime}-${slot.endTime}`);
    } else if (options.includeStartTime) {
      parts.push(slot.startTime);
    } else if (options.includeEndTime) {
      parts.push(slot.endTime);
    }
    parts.push(slot.performerName);
    if (options.includeSns && slot.snsHandle) {
      const handle = `@${slot.snsHandle.replace(/^@/, "")}`;
      parts.push(options.snsParentheses ? `(${handle})` : handle);
    }
    lines.push(parts.join("  "));
  }
  // 開始時刻のみ表示している場合、最後の枠の終了時刻がわからなくなるため末尾に補足する
  if (options.includeStartTime && !options.includeEndTime && slots.length > 0) {
    lines.push(`${slots[slots.length - 1].endTime} End`);
  }
  return lines.join("\n");
}
