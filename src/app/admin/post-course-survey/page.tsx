import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { formatLessonDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

async function getSurveyResponses() {
  const responses = await prisma.surveyResponse.findMany({
    orderBy: { submittedAt: "desc" },
  });
  return responses;
}

export default async function AdminPostCourseSurveyPage() {
  const [admin, responses] = await Promise.all([getCurrentAdmin(), getSurveyResponses()]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">受講後アンケート</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            イベント出演案内メールの回答ページから送られたアンケートの回答一覧です。
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
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            レッスン進捗
          </Link>
          <Link
            href="/admin/form-responses"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会アンケート
          </Link>
          <Link
            href="/admin/debut-events"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            デビューイベント
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {responses.length === 0 && (
          <p className="p-4 text-sm text-slate-500">回答がまだありません。</p>
        )}
        <ul className="divide-y divide-slate-100">
          {responses.map((response) => (
            <li key={response.id}>
              <Link
                href={`/admin/post-course-survey/${response.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {response.studentName}
                    <span className="ml-2 text-xs font-normal text-slate-400">DJネーム: {response.djName}</span>
                  </p>
                  <p className="text-xs text-slate-400">{response.studentEmail}</p>
                </div>
                <p className="text-xs text-slate-400">{formatLessonDateTime(response.submittedAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
