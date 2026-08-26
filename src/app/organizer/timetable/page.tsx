import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteEventButton } from "./DeleteEventButton";
import { CreateEventButton } from "./CreateEventButton";

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
    <div className="space-y-3">
      <CreateEventButton />

      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-slate-500">イベントがまだありません。</p>}
        {events.map((event) => (
          <div
            key={event.id}
            className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow"
          >
            <Link href={`/organizer/timetable/${event.id}`} className="block pr-14">
              <h2 className="text-sm font-bold text-slate-900">{event.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{formatDateRange(event.days.map((d) => d.date))}</p>
            </Link>
            <DeleteEventButton eventId={event.id} eventName={event.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
