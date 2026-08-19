import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateHeading, formatTimeOnly, getJstDateKey } from "@/lib/date";

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
    remainingSlots: lesson.maxSlots - lesson._count.bookings,
  }));
}

type UpcomingLesson = Awaited<ReturnType<typeof getUpcomingLessons>>[number];

function groupLessonsByDate(lessons: UpcomingLesson[]) {
  const groups: { dateKey: string; heading: string; lessons: UpcomingLesson[] }[] = [];

  for (const lesson of lessons) {
    const dateKey = getJstDateKey(lesson.datetime);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateKey === dateKey) {
      lastGroup.lessons.push(lesson);
    } else {
      groups.push({ dateKey, heading: formatDateHeading(lesson.datetime), lessons: [lesson] });
    }
  }

  return groups;
}

const ROW_GRID = "grid grid-cols-[56px_1fr_1fr_64px] items-center gap-2 px-3";

export default async function HomePage() {
  const lessons = await getUpcomingLessons();
  const dateGroups = groupLessonsByDate(lessons);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold text-slate-900">レッスン予約</h1>
      <p className="mt-1 text-sm text-slate-500">
        受講したいレッスンを選んで予約してください。
      </p>

      <div className="mt-4 flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:gap-6">
        <a
          href="https://www.notion.so/3735fe86c92a8063825ffc77f552bc95?source=copy_link"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline-offset-2 hover:underline"
        >
          レッスンに関する注意点
        </a>
        <a
          href="https://note.com/ginza_member"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline-offset-2 hover:underline"
        >
          DJお役立ちnote
        </a>
      </div>

      {dateGroups.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          現在予約可能なレッスンはありません。
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {dateGroups.map((group) => (
            <section key={group.dateKey}>
              <h2 className="border-b border-slate-200 pb-1 text-sm font-bold text-slate-700">
                {group.heading}
              </h2>
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div
                  className={`${ROW_GRID} bg-slate-50 py-2 text-xs font-medium text-slate-400`}
                >
                  <span>時間</span>
                  <span>講習</span>
                  <span>講師</span>
                  <span className="text-right">空き枠</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.lessons.map((lesson) => {
                    const isFull = lesson.remainingSlots <= 0;
                    const rowInner = (
                      <div
                        className={`${ROW_GRID} py-3 text-sm ${isFull ? "text-slate-400" : "text-slate-900"}`}
                      >
                        <span>{formatTimeOnly(lesson.datetime)}</span>
                        <span className="truncate font-semibold">{lesson.name}</span>
                        <span className="truncate">{lesson.instructorName}</span>
                        <span
                          className={
                            "justify-self-end rounded-full px-2 py-0.5 text-xs font-semibold " +
                            (isFull
                              ? "bg-slate-200 text-slate-500"
                              : lesson.remainingSlots <= 1
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700")
                          }
                        >
                          {isFull ? "満席" : `残り${lesson.remainingSlots}`}
                        </span>
                      </div>
                    );

                    return isFull ? (
                      <div
                        key={lesson.id}
                        aria-disabled="true"
                        className="cursor-not-allowed select-none bg-slate-50"
                      >
                        {rowInner}
                      </div>
                    ) : (
                      <Link
                        key={lesson.id}
                        href={`/lessons/${lesson.id}/book`}
                        className="block transition hover:bg-sky-50"
                      >
                        {rowInner}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
