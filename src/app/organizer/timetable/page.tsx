import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

async function getEvents() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: { floors: { select: { id: true } } },
      },
    },
  });
  return events;
}

function formatDateRange(dates: Date[]): string {
  if (dates.length === 0) return "日程未設定";
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const fmt = (d: Date) => `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  if (sorted.length === 1) return fmt(sorted[0]);
  return `${fmt(sorted[0])} 〜 ${fmt(sorted[sorted.length - 1])}`;
}

export default async function TimetableEventListPage() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">タイムテーブル作成</h1>
        <p className="mt-1 text-sm text-slate-500">
          イベントを作成し、開催日・フロアごとにタイムテーブルを自動作成できます。
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <NewEventForm />
      </div>

      <div className="space-y-3">
        {events.length === 0 && <p className="text-sm text-slate-500">イベントがまだありません。</p>}
        {events.map((event) => {
          const floorCount = event.days.reduce((sum, d) => sum + d.floors.length, 0);
          return (
            <Link
              key={event.id}
              href={`/organizer/timetable/${event.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">{event.name}</h2>
                <span className="text-xs text-slate-400">
                  {event.days.length}日開催 / {floorCount}フロア
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateRange(event.days.map((d) => d.date))}
              </p>
              {event.memo && <p className="mt-1 text-xs text-slate-400">{event.memo}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
