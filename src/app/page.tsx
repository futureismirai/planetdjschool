import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLessonDateTime } from "@/lib/date";

export const dynamic = "force-dynamic";

async function getUpcomingLessons() {
  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: new Date() } },
    orderBy: { datetime: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime,
    instructorName: lesson.instructorName,
    location: lesson.location,
    remainingSlots: lesson.maxSlots - lesson._count.bookings,
  }));
}

export default async function HomePage() {
  const lessons = await getUpcomingLessons();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">レッスン予約</h1>
      <p className="mt-1 text-sm text-slate-500">
        受講したいレッスンを選んで予約してください。
      </p>

      {lessons.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          現在予約可能なレッスンはありません。
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lessons.map((lesson) => {
            const isFull = lesson.remainingSlots <= 0;
            const cardContent = (
              <div
                className={
                  "rounded-lg border p-4 shadow-sm transition " +
                  (isFull
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-200 bg-white hover:border-sky-400 hover:shadow-md")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <h2
                    className={
                      "text-base font-bold " +
                      (isFull ? "text-slate-400" : "text-slate-900")
                    }
                  >
                    {lesson.name}
                  </h2>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (isFull
                        ? "bg-slate-200 text-slate-500"
                        : lesson.remainingSlots <= 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700")
                    }
                  >
                    {isFull ? "満席" : `残り${lesson.remainingSlots}枠`}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-14 text-slate-400">日時</dt>
                    <dd>{formatLessonDateTime(lesson.datetime)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-14 text-slate-400">講師</dt>
                    <dd>{lesson.instructorName}</dd>
                  </div>
                  {lesson.location && (
                    <div className="flex gap-2">
                      <dt className="w-14 text-slate-400">会場</dt>
                      <dd>{lesson.location}</dd>
                    </div>
                  )}
                </dl>
              </div>
            );

            return (
              <li key={lesson.id}>
                {isFull ? (
                  <div aria-disabled="true" className="cursor-not-allowed select-none">
                    {cardContent}
                  </div>
                ) : (
                  <Link href={`/lessons/${lesson.id}/book`} className="block">
                    {cardContent}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
