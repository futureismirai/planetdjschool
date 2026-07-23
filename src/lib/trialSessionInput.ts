export type TrialSessionInputResult =
  | { data: { instructorName: string; datetime: Date; maxSlots: number } }
  | { error: string };

export function parseTrialSessionInput(body: unknown): TrialSessionInputResult {
  const { datetime, instructorName, maxSlots } = (body ?? {}) as Record<string, unknown>;

  if (typeof instructorName !== "string" || !instructorName.trim()) {
    return { error: "参加講師を入力してください。" };
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
      instructorName: instructorName.trim(),
      datetime: new Date(datetime),
      maxSlots: maxSlotsNum,
    },
  };
}
