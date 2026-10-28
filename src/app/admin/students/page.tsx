import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNavMenu } from "../AdminNavMenu";
import { formatLessonDateTime } from "@/lib/date";
import { getStudents } from "@/lib/students";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// レッスン番号ごとに色分けする(Lesson 1, 2, 3, ...)。番号が無い名前(未定など)はグレー。
const LESSON_BADGE_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

function lessonBadgeClassName(lessonName: string): string {
  const match = lessonName.match(/^Lesson (\d+)$/);
  if (!match) return "bg-slate-100 text-slate-600";
  const index = (Number(match[1]) - 1) % LESSON_BADGE_COLORS.length;
  return LESSON_BADGE_COLORS[index];
}

// 進捗の並び替え用に、完了済みの最新レッスン名から番号を取り出す(Lesson 1, 2, ... 以外は-1扱い)。
function lessonNumber(lessonName: string | null): number {
  if (!lessonName) return -1;
  const match = lessonName.match(/^Lesson (\d+)$/);
  return match ? Number(match[1]) : -1;
}

// 既に別の方法でイベント出演が決定済みのため、イベント出演メール送信ボタンを個別に非表示にする生徒(2026年11月時点)。
const EVENT_DECIDED_EMAILS = new Set([
  "sakura.no.apple@icloud.com",
  "ai75ri@i.softbank.jp",
  "hinako.kawai63@gmail.com",
  "0tonooka@gmail.com",
  "essocd@gmail.com",
  "a16suzu@icloud.com",
]);

type DebutStatus = "before" | "done";

export default async function AdminStudentsPage() {
  const [admin, students, eventInviteResponses, debutParticipations] = await Promise.all([
    getCurrentAdmin(),
    getStudents(),
    prisma.eventInviteResponse.findMany({ select: { studentEmail: true } }),
    prisma.debutEventParticipant.findMany({
      where: { status: "participating" },
      include: { event: true },
      orderBy: { event: { startDatetime: "desc" } },
    }),
  ]);
  const eventInviteSentEmails = new Set(eventInviteResponses.map((r) => r.studentEmail.toLowerCase()));

  // 生徒ごとに最新(最も開催日時が新しい)デビューイベントの登録を採用し、
  // その開催日時を過ぎていれば「デビュー済み」、まだなら「デビュー前」とする。
  const now = new Date();
  const debutStatusByEmail = new Map<string, DebutStatus>();
  for (const p of debutParticipations) {
    const email = p.studentEmail.toLowerCase();
    if (debutStatusByEmail.has(email)) continue;
    debutStatusByEmail.set(email, p.event.endDatetime < now ? "done" : "before");
  }

  const sorted = [...students].sort((a, b) => {
    const debutDiff =
      Number(debutStatusByEmail.get(a.email) === "done") - Number(debutStatusByEmail.get(b.email) === "done");
    if (debutDiff !== 0) return debutDiff;

    const lessonDiff = lessonNumber(a.latestFinishedLesson) - lessonNumber(b.latestFinishedLesson);
    if (lessonDiff !== 0) return -lessonDiff;

    if (a.lastLessonDatetime && b.lastLessonDatetime) {
      return b.lastLessonDatetime.getTime() - a.lastLessonDatetime.getTime();
    }
    if (a.lastLessonDatetime) return -1;
    if (b.lastLessonDatetime) return 1;
    return a.displayName.localeCompare(b.displayName, "ja");
  });

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">レッスン進捗</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            グループレッスン・個別レッスンの生徒ごとに進捗コメントを記入できます(体験会は対象外)。名前をタップすると詳細に移動します。
          </p>
        </div>
        <AdminNavMenu />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {sorted.length === 0 && (
          <p className="p-4 text-sm text-slate-500">対象の生徒がまだいません。</p>
        )}
        <ul className="divide-y divide-slate-100">
          {sorted.map((student) => (
            <li
              key={student.email}
              className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/admin/students/${encodeURIComponent(student.email)}`} className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900">{student.displayName}</p>
                  {student.latestFinishedLesson && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${lessonBadgeClassName(student.latestFinishedLesson)}`}
                    >
                      {student.latestFinishedLesson} 終
                    </span>
                  )}
                  {debutStatusByEmail.get(student.email) === "before" && (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                      デビュー前
                    </span>
                  )}
                  {debutStatusByEmail.get(student.email) === "done" && (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      デビュー済み
                    </span>
                  )}
                  {student.missingCommentInstructors.length > 0 && (
                    <span
                      title={`コメント未記入: ${student.missingCommentInstructors.join("、")}`}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                    >
                      ⚠ 未記入: {student.missingCommentInstructors.join("、")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{student.email}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                <p className="text-xs text-slate-400">
                  {student.lastLessonDatetime
                    ? `最新レッスン: ${formatLessonDateTime(student.lastLessonDatetime)}`
                    : ""}
                </p>
                {!eventInviteSentEmails.has(student.email) && !EVENT_DECIDED_EMAILS.has(student.email) && (
                  <Link
                    href={`/admin/students/${encodeURIComponent(student.email)}/event-invite`}
                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                  >
                    イベント出演メール送信
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
