export type DebutEventInputResult =
  | { data: { startDatetime: Date; endDatetime: Date; venue: string | null } }
  | { error: string };

export function parseDebutEventInput(body: unknown): DebutEventInputResult {
  const { startDatetime, endDatetime, venue } = (body ?? {}) as Record<string, unknown>;

  if (typeof startDatetime !== "string" || Number.isNaN(new Date(startDatetime).getTime())) {
    return { error: "開始日時を正しく入力してください。" };
  }
  if (typeof endDatetime !== "string" || Number.isNaN(new Date(endDatetime).getTime())) {
    return { error: "終了日時を正しく入力してください。" };
  }
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  if (start >= end) {
    return { error: "終了日時は開始日時より後にしてください。" };
  }
  if (venue !== undefined && venue !== null && typeof venue !== "string") {
    return { error: "会場の形式が正しくありません。" };
  }

  return {
    data: {
      startDatetime: start,
      endDatetime: end,
      venue: typeof venue === "string" && venue.trim() ? venue.trim() : null,
    },
  };
}
