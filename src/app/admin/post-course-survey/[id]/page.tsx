import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../../LogoutButton";
import { formatLessonDateTime } from "@/lib/date";
import { SURVEY_QUESTIONS, type SurveyAnswers } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SurveyResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [admin, response] = await Promise.all([
    getCurrentAdmin(),
    prisma.surveyResponse.findUnique({ where: { id } }),
  ]);

  if (!response) {
    notFound();
  }

  const answers: SurveyAnswers = {
    djName: response.djName,
    joinStatus: response.joinStatus,
    lessonSufficiency: response.lessonSufficiency,
    moreToLearn: response.moreToLearn ?? "",
    wantsMoreLessons: response.wantsMoreLessons,
    improvements: response.improvements ?? "",
    message: response.message ?? "",
    contactPreference: response.contactPreference ?? "",
    instagramHandle: response.instagramHandle ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{response.studentName} 様のアンケート回答</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {response.studentEmail} ・ {formatLessonDateTime(response.submittedAt)}
          </p>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/post-course-survey"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            一覧に戻る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {SURVEY_QUESTIONS.map((q, i) => (
          <div key={q.key} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Q{i + 1}. {q.question}
            </p>
            {"note" in q && q.note && <p className="mt-0.5 text-xs text-slate-400">（{q.note}）</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {answers[q.key] || <span className="text-slate-400">(未回答)</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
