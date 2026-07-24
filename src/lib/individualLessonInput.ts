export type IndividualLessonInputResult =
  | { data: { name: string; instructorName: string; datetime: Date } }
  | { error: string };

export function parseIndividualLessonInput(body: unknown): IndividualLessonInputResult {
  const { name, datetime, instructorName } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "レッスン名を入力してください。" };
  }
  if (typeof instructorName !== "string" || !instructorName.trim()) {
    return { error: "講師名を入力してください。" };
  }
  if (typeof datetime !== "string" || Number.isNaN(new Date(datetime).getTime())) {
    return { error: "日時を正しく入力してください。" };
  }

  return {
    data: {
      name: name.trim(),
      instructorName: instructorName.trim(),
      datetime: new Date(datetime),
    },
  };
}
