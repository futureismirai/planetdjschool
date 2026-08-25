// イベントオーガナイザーツール: タイムテーブル自動作成ロジック
// 時刻はすべて "HH:mm" 形式の文字列で扱う（日をまたぐ深夜イベントも考慮）

export type RoundingMode = "none" | "5min" | "10min";

export type PerformerInput = {
  name: string;
  snsHandle?: string;
  /** この出演者の時間を固定したい場合に指定する（両方揃っている場合のみ固定扱い） */
  fixedStart?: string;
  fixedEnd?: string;
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

type GapSlot = { startMin: number; endMin: number };

/**
 * 指定した区間 [start, end) を count 個に分割する。
 * rounding が指定されている場合は境界を5分/10分単位に丸め、
 * ほぼ均等になるようにしつつ最後の枠で端数を吸収する。
 */
function splitEvenly(start: number, end: number, count: number, rounding: RoundingMode): GapSlot[] {
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

  const result: GapSlot[] = [];
  for (let i = 0; i < count; i++) {
    result.push({ startMin: boundaries[i], endMin: boundaries[i + 1] });
  }
  return result;
}

/**
 * 出演者リストとフロアの開始・終了時刻から、タイムテーブルを自動作成する。
 * - デフォルトは均等割り
 * - rounding で5分/10分単位のほぼ均等な区切りに変更可能
 * - fixedStart/fixedEnd が指定された出演者はその時間で固定し、
 *   残りの出演者はその前後の空き時間内でそれぞれ均等に配置する
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
  if (endMin <= startMin) {
    throw new Error("終了時刻は開始時刻より後にしてください。");
  }

  const fixedRanges: (GapSlot | null)[] = performers.map((p) => {
    if (!p.fixedStart || !p.fixedEnd) return null;
    const fs = toMinutes(p.fixedStart);
    const rawFe = toMinutes(p.fixedEnd);
    const fe = resolveEndAfterStart(fs, rawFe);
    // 固定時間はフロア開始時刻を基準にした連続分に正規化する
    const normalizedStart = fs < startMin ? fs + 1440 : fs;
    const normalizedEnd = normalizedStart + (fe - fs);
    return { startMin: normalizedStart, endMin: normalizedEnd };
  });

  const results: GeneratedSlot[] = new Array(performers.length);

  performers.forEach((p, i) => {
    const fixed = fixedRanges[i];
    if (fixed) {
      results[i] = {
        name: p.name,
        snsHandle: p.snsHandle,
        startTime: toHHMM(fixed.startMin),
        endTime: toHHMM(fixed.endMin),
        isFixed: true,
      };
    }
  });

  let cursor = startMin;
  let i = 0;
  while (i < performers.length) {
    if (fixedRanges[i]) {
      cursor = Math.max(cursor, fixedRanges[i]!.endMin);
      i++;
      continue;
    }
    const runStart = i;
    while (i < performers.length && !fixedRanges[i]) i++;
    const runEnd = i;
    const gapEnd = i < performers.length ? fixedRanges[i]!.startMin : endMin;
    const count = runEnd - runStart;
    const gapStart = Math.min(cursor, gapEnd);
    const slots = splitEvenly(gapStart, gapEnd, count, rounding);
    for (let k = 0; k < count; k++) {
      const p = performers[runStart + k];
      results[runStart + k] = {
        name: p.name,
        snsHandle: p.snsHandle,
        startTime: toHHMM(slots[k].startMin),
        endTime: toHHMM(slots[k].endMin),
        isFixed: false,
      };
    }
    cursor = gapEnd;
  }

  return results;
}

/** タイムテーブルをSNSにそのまま貼り付けられるテキスト形式に変換する */
export function formatTimetableForSns(
  title: string,
  slots: { performerName: string; snsHandle: string | null; startTime: string; endTime: string }[]
): string {
  const lines = [title, ""];
  for (const slot of slots) {
    const handle = slot.snsHandle ? ` (@${slot.snsHandle.replace(/^@/, "")})` : "";
    lines.push(`${slot.startTime}-${slot.endTime}  ${slot.performerName}${handle}`);
  }
  return lines.join("\n");
}
