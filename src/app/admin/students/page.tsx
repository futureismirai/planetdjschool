import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { formatLessonDateTime } from "@/lib/date";
import { getStudents } from "@/lib/students";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const [admin, students] = await Promise.all([getCurrentAdmin(), getStudents()]);

  const sorted = [...students].sort((a, b) => {
    if (a.lastCommentUpdatedAt && b.lastCommentUpdatedAt) {
      return b.lastCommentUpdatedAt.getTime() - a.lastCommentUpdatedAt.getTime();
    }
    if (a.lastCommentUpdatedAt) return -1;
    if (b.lastCommentUpdatedAt) return 1;
    return a.displayName.localeCompare(b.displayName, "ja");
  });

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">生徒別進捗</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            グループレッスン・個別レッスンの生徒ごとに進捗コメントを記入できます(体験会は対象外)。名前をタップすると詳細に移動します。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            カレンダー
          </Link>
          <Link
            href="/admin/lessons"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            グループレッスン
          </Link>
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会
          </Link>
          <Link
            href="/admin/individual"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            個別レッスン
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {sorted.length === 0 && (
          <p className="p-4 text-sm text-slate-500">対象の生徒がまだいません。</p>
        )}
        <ul className="divide-y divide-slate-100">
          {sorted.map((student) => (
            <li key={student.email}>
              <Link
                href={`/admin/students/${encodeURIComponent(student.email)}`}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{student.displayName}</p>
                  <p className="text-xs text-slate-400">{student.email}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {student.lastCommentUpdatedAt
                    ? `最終更新: ${formatLessonDateTime(student.lastCommentUpdatedAt)}`
                    : "コメント未記入"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
