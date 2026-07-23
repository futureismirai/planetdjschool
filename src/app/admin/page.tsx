import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { formatLessonDateTime } from "@/lib/date";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

async function getAllLessonsWithBookings() {
  const lessons = await prisma.lesson.findMany({
    orderBy: { datetime: "desc" },
    include: {
      bookings: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return lessons.map((lesson) => ({
    ...lesson,
    remainingSlots: lesson.maxSlots - lesson.bookings.length,
  }));
}

export default async function AdminDashboardPage() {
  const [admin, lessons] = await Promise.all([getCurrentAdmin(), getAllLessonsWithBookings()]);
  const now = new Date();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">予約管理</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <LogoutButton />
      </div>

      <div className="mt-6 space-y-6">
        {lessons.length === 0 && (
          <p className="text-sm text-slate-500">レッスンが登録されていません。</p>
        )}

        {lessons.map((lesson) => {
          const isPast = lesson.datetime < now;
          return (
            <section
              key={lesson.id}
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                    {lesson.name}
                    {isPast && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                        終了
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLessonDateTime(lesson.datetime)} ／ 講師: {lesson.instructorName}
                    {lesson.location ? ` ／ 会場: ${lesson.location}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  予約 {lesson.bookings.length} / {lesson.maxSlots}（残り{Math.max(lesson.remainingSlots, 0)}）
                </span>
              </div>

              {lesson.bookings.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">予約はまだありません。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400">
                        <th className="px-4 py-2 font-medium">生徒名</th>
                        <th className="px-4 py-2 font-medium">メールアドレス</th>
                        <th className="px-4 py-2 font-medium">電話番号</th>
                        <th className="px-4 py-2 font-medium">予約日時</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2">{booking.studentName}</td>
                          <td className="px-4 py-2">{booking.studentEmail}</td>
                          <td className="px-4 py-2">{booking.studentPhone ?? "-"}</td>
                          <td className="px-4 py-2 text-slate-500">
                            {formatLessonDateTime(booking.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
