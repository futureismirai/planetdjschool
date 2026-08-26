import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getEvents() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      days: { orderBy: { date: "asc" } },
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
          イベント名・開催日・時間・出演者を1画面で入力するだけでタイムテーブルを自動作成できます。
        </p>
      </div>

      <Link
        href="/organizer/timetable/new"
        className="inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        ＋ 新しいイベントを作成
      </Link>

      <div className="space-y-3">
        {events.length === 0 && <p className="text-sm text-slate-500">イベントがまだありません。</p>}
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/organizer/timetable/${event.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
          >
            <h2 className="text-base font-bold text-slate-900">{event.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{formatDateRange(event.days.map((d) => d.date))}</p>
            {event.memo && <p className="mt-1 text-xs text-slate-400">{event.memo}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
