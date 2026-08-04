import { prisma } from "@/lib/prisma";

/**
 * メールアドレスをキーに、体験会・グループレッスン・個別レッスンで登録された
 * 生徒名をまとめる(同一メールアドレスに複数の登録がある場合は最も古い登録の名前を採用)。
 * Googleフォームの回答一覧で確実に名前を表示するために使用する
 * (フォーム側の質問文だけに頼ると、名前を尋ねる質問がどれか判別できない場合があるため)。
 */
export async function getKnownStudentNames(): Promise<Map<string, string>> {
  const [trialParticipants, bookings, individualParticipants] = await Promise.all([
    prisma.trialParticipant.findMany({
      select: { studentName: true, studentEmail: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { studentEmail: { not: null } },
      select: { studentName: true, studentEmail: true, createdAt: true },
    }),
    prisma.individualParticipant.findMany({
      select: { studentName: true, studentEmail: true, createdAt: true },
    }),
  ]);

  type Rec = { email: string; studentName: string; createdAt: Date };
  const all: Rec[] = [];

  for (const p of trialParticipants) {
    all.push({ email: p.studentEmail, studentName: p.studentName, createdAt: p.createdAt });
  }
  for (const b of bookings) {
    if (b.studentEmail) {
      all.push({ email: b.studentEmail, studentName: b.studentName, createdAt: b.createdAt });
    }
  }
  for (const p of individualParticipants) {
    all.push({ email: p.studentEmail, studentName: p.studentName, createdAt: p.createdAt });
  }

  all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const map = new Map<string, string>();
  for (const r of all) {
    const key = r.email.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, r.studentName);
    }
  }
  return map;
}
