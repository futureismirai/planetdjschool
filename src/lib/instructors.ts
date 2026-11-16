import { prisma } from "./prisma";

// 「未定」は実際の講師ではないため講師一覧(Instructorテーブル)には登録しないが、
// レッスン・体験会・個別レッスン作成フォームの選択肢には引き続き残す。
const UNASSIGNED_INSTRUCTOR_NAME = "未定";

/**
 * レッスン・体験会・個別レッスンの作成フォームで選べる講師名の一覧を取得する。
 * 登録順(createdAt昇順)で返すため、新しく登録した講師は選択肢の末尾に追加される。
 * 「未定」は講師一覧には存在しない特別な選択肢として、常に末尾に追加する。
 */
export async function getInstructorNames(): Promise<string[]> {
  const instructors = await prisma.instructor.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  const names = instructors
    .map((i) => i.name)
    .filter((name) => name !== UNASSIGNED_INSTRUCTOR_NAME);
  return [...names, UNASSIGNED_INSTRUCTOR_NAME];
}

/**
 * 講師名から、講師一覧に登録されているメールアドレスを取得する。
 * 「未定」や未登録の講師名の場合はnullを返す。
 */
export async function getInstructorEmailByName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed || trimmed === UNASSIGNED_INSTRUCTOR_NAME) return null;

  const instructor = await prisma.instructor.findUnique({
    where: { name: trimmed },
    select: { email: true },
  });
  return instructor?.email ?? null;
}
