// イベントオーガナイザーツール: APIリクエストのバリデーション

export type ParseResult<T> = { data: T } | { error: string };

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

export function parseEventInput(body: unknown): ParseResult<{ name: string; memo: string | null }> {
  const { name, memo } = asRecord(body);
  if (typeof name !== "string" || !name.trim()) {
    return { error: "イベント名を入力してください。" };
  }
  if (memo !== undefined && memo !== null && typeof memo !== "string") {
    return { error: "メモの形式が正しくありません。" };
  }
  return { data: { name: name.trim(), memo: typeof memo === "string" && memo.trim() ? memo.trim() : null } };
}

export function parseEventDayInput(
  body: unknown
): ParseResult<{ date: Date; label: string | null; order: number }> {
  const { date, label, order } = asRecord(body);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "日付をYYYY-MM-DD形式で入力してください。" };
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "日付の形式が正しくありません。" };
  }
  if (label !== undefined && label !== null && typeof label !== "string") {
    return { error: "日程ラベルの形式が正しくありません。" };
  }
  const orderNum = order === undefined ? 0 : Number(order);
  if (!Number.isFinite(orderNum)) {
    return { error: "並び順の形式が正しくありません。" };
  }
  return {
    data: {
      date: parsedDate,
      label: typeof label === "string" && label.trim() ? label.trim() : null,
      order: orderNum,
    },
  };
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function normalizeTime(value: unknown, fieldLabel: string): { value: string } | { error: string } {
  if (typeof value !== "string" || !TIME_RE.test(value.trim())) {
    return { error: `${fieldLabel}をHH:mm形式で入力してください。` };
  }
  const [h, m] = value.trim().split(":");
  return { value: `${h.padStart(2, "0")}:${m}` };
}

export function parseEventFloorInput(
  body: unknown
): ParseResult<{ name: string; startTime: string; endTime: string; order: number }> {
  const { name, startTime, endTime, order } = asRecord(body);
  if (typeof name !== "string" || !name.trim()) {
    return { error: "フロア名を入力してください。" };
  }
  const start = normalizeTime(startTime, "開始時刻");
  if ("error" in start) return start;
  const end = normalizeTime(endTime, "終了時刻");
  if ("error" in end) return end;
  const orderNum = order === undefined ? 0 : Number(order);
  if (!Number.isFinite(orderNum)) {
    return { error: "並び順の形式が正しくありません。" };
  }
  return { data: { name: name.trim(), startTime: start.value, endTime: end.value, order: orderNum } };
}

export type PerformerInputRaw = {
  name: string;
  snsHandle?: string;
  fixedStart?: string;
  fixedEnd?: string;
};

export function parseGenerateInput(
  body: unknown
): ParseResult<{
  performers: PerformerInputRaw[];
  rounding: "none" | "5min" | "10min";
}> {
  const { performers, rounding } = asRecord(body);
  if (!Array.isArray(performers) || performers.length === 0) {
    return { error: "出演者を1名以上入力してください。" };
  }
  const parsedPerformers: PerformerInputRaw[] = [];
  for (const raw of performers) {
    const p = asRecord(raw);
    if (typeof p.name !== "string" || !p.name.trim()) {
      return { error: "出演者名をすべて入力してください。" };
    }
    const sns = typeof p.snsHandle === "string" && p.snsHandle.trim() ? p.snsHandle.trim().replace(/^@/, "") : undefined;
    let fixedStart: string | undefined;
    let fixedEnd: string | undefined;
    if (p.fixedStart || p.fixedEnd) {
      const fs = normalizeTime(p.fixedStart, "固定開始時刻");
      if ("error" in fs) return fs;
      const fe = normalizeTime(p.fixedEnd, "固定終了時刻");
      if ("error" in fe) return fe;
      fixedStart = fs.value;
      fixedEnd = fe.value;
    }
    parsedPerformers.push({ name: p.name.trim(), snsHandle: sns, fixedStart, fixedEnd });
  }
  const roundingValue = rounding === "5min" || rounding === "10min" ? rounding : "none";
  return { data: { performers: parsedPerformers, rounding: roundingValue } };
}

export function parseSlotInput(
  body: unknown
): ParseResult<{
  performerName: string;
  snsHandle: string | null;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  order: number;
}> {
  const { performerName, snsHandle, startTime, endTime, isFixed, order } = asRecord(body);
  if (typeof performerName !== "string" || !performerName.trim()) {
    return { error: "出演者名を入力してください。" };
  }
  const start = normalizeTime(startTime, "開始時刻");
  if ("error" in start) return start;
  const end = normalizeTime(endTime, "終了時刻");
  if ("error" in end) return end;
  if (snsHandle !== undefined && snsHandle !== null && typeof snsHandle !== "string") {
    return { error: "SNSアカウント名の形式が正しくありません。" };
  }
  const orderNum = order === undefined ? 0 : Number(order);
  if (!Number.isFinite(orderNum)) {
    return { error: "並び順の形式が正しくありません。" };
  }
  return {
    data: {
      performerName: performerName.trim(),
      snsHandle: typeof snsHandle === "string" && snsHandle.trim() ? snsHandle.trim().replace(/^@/, "") : null,
      startTime: start.value,
      endTime: end.value,
      isFixed: Boolean(isFixed),
      order: orderNum,
    },
  };
}

export function parseReorderInput(body: unknown): ParseResult<{ orderedIds: string[] }> {
  const { orderedIds } = asRecord(body);
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
    return { error: "並び替えデータの形式が正しくありません。" };
  }
  return { data: { orderedIds: orderedIds as string[] } };
}

export function parseVenueInput(
  body: unknown
): ParseResult<{
  name: string;
  address: string | null;
  access: string | null;
  conditions: string | null;
  equipment: string | null;
  notes: string | null;
}> {
  const { name, address, access, conditions, equipment, notes } = asRecord(body);
  if (typeof name !== "string" || !name.trim()) {
    return { error: "会場名を入力してください。" };
  }
  const textFields = { address, access, conditions, equipment, notes };
  for (const [key, value] of Object.entries(textFields)) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { error: `${key}の形式が正しくありません。` };
    }
  }
  const norm = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    data: {
      name: name.trim(),
      address: norm(address),
      access: norm(access),
      conditions: norm(conditions),
      equipment: norm(equipment),
      notes: norm(notes),
    },
  };
}

const MAX_PHOTO_DATA_URL_LENGTH = 8 * 1024 * 1024; // base64換算で約6MB程度の画像まで許可

export function parseVenuePhotoInput(
  body: unknown
): ParseResult<{ dataUrl: string; caption: string | null }> {
  const { dataUrl, caption } = asRecord(body);
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return { error: "画像データの形式が正しくありません。" };
  }
  if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return { error: "画像サイズが大きすぎます。もう少し小さい画像を選択してください。" };
  }
  if (caption !== undefined && caption !== null && typeof caption !== "string") {
    return { error: "キャプションの形式が正しくありません。" };
  }
  return {
    data: { dataUrl, caption: typeof caption === "string" && caption.trim() ? caption.trim() : null },
  };
}
