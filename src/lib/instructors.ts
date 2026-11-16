import { prisma } from "./prisma";

/**
 * レッスン・体験会・個別レッスンの作成フォームで選べる講師名の一覧を取得する。
 * 登録順(createdAt昇順)で返すため、新しく登録した講師は選択肢の末尾に追加される。
 */
export async function getInstructorNames(): Promise<string[]> {
  const instructors = await prisma.instructor.findMany({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  return instructors.map((i) => i.name);
}
