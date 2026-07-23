export type LessonInputResult =
  | { data: { name: string; instructorName: string; datetime: Date; maxSlots: number } }
  | { error: string };

export function parseLessonInput(body: unknown): LessonInputResult {
  const { name, datetime, instructorName, maxSlots } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "レッスン名を入力してください。" };
  }
  if (typeof instructorName !== "string" || !instructorName.trim()) {
    return { error: "講師名を入力してください。" };
  }
  if (typeof datetime !== "string" || Number.isNaN(new Date(datetime).getTime())) {
    return { error: "日時を正しく入力してください。" };
  }
  const maxSlotsNum = typeof maxSlots === "number" ? maxSlots : Number(maxSlots ?? 3);
  if (!Number.isInteger(maxSlotsNum) || maxSlotsNum < 1) {
    return { error: "定員は1以上の整数で入力してください。" };
  }

  return {
    data: {
      name: name.trim(),
      instructorName: instructorName.trim(),
      datetime: new Date(datetime),
      maxSlots: maxSlotsNum,
    },
  };
}
