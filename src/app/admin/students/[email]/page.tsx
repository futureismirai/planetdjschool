import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../../LogoutButton";
import { formatLessonDateTime } from "@/lib/date";
import { getStudents } from "@/lib/students";
import { ProgressCommentField } from "../ProgressCommentField";

export const dynamic = "force-dynamic";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email).trim().toLowerCase();

  const [admin, students] = await Promise.all([getCurrentAdmin(), getStudents()]);
  const student = students.find((s) => s.email === decodedEmail);

  if (!student) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{student.displayName}</h1>
          <p className="mt-0.5 text-xs text-slate-400">{student.email}</p>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            生徒一覧に戻る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {student.attendances.map((a) => (
          <li
            key={`${a.type}-${a.id}`}
            className="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                  (a.type === "group"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-emerald-100 text-emerald-700")
                }
              >
                {a.type === "group" ? "グループ" : "個別"}
              </span>
              <span className="text-sm font-medium text-slate-800">{a.lessonName}</span>
              <span className="text-xs text-slate-500">{formatLessonDateTime(a.datetime)}</span>
              <span className="text-xs text-slate-500">講師: {a.instructorName}</span>
            </div>
            <ProgressCommentField type={a.type} id={a.id} initialComment={a.comment} />
          </li>
        ))}
      </ul>
    </div>
  );
}
