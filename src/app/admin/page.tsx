import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { formatTimeOnly, getJstDateKey, getJstMonthRange, getJstNowYearMonth } from "@/lib/date";

export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function weekdayOfDateKey(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function daysInMonth(year: number, month: number): number {
  // Date.UTC の月は0始まりなので、month(1始まり)をそのまま渡すと「翌月の0日目」= 当月末日になる
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseYearMonth(ym: string | undefined): { year: number; month: number } {
  const match = ym?.match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  return getJstNowYearMonth();
}

function shiftYearMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

type CalendarEvent = {
  id: string;
  time: string;
  label: string;
  href: string;
  kind: "lesson" | "trial";
};

async function getCalendarEvents(year: number, month: number) {
  const { start, end } = getJstMonthRange(year, month);

  const [lessons, trialSessions] = await Promise.all([
    prisma.lesson.findMany({
      where: { datetime: { gte: start, lt: end } },
      orderBy: { datetime: "asc" },
    }),
    prisma.trialSession.findMany({
      where: { datetime: { gte: start, lt: end } },
      orderBy: { datetime: "asc" },
    }),
  ]);

  const eventsByDate = new Map<string, CalendarEvent[]>();

  const push = (dateKey: string, event: CalendarEvent) => {
    const list = eventsByDate.get(dateKey) ?? [];
    list.push(event);
    eventsByDate.set(dateKey, list);
  };

  for (const lesson of lessons) {
    push(getJstDateKey(lesson.datetime), {
      id: lesson.id,
      time: formatTimeOnly(lesson.datetime),
      label: lesson.name,
      href: `/admin/lessons#lesson-${lesson.id}`,
      kind: "lesson",
    });
  }
  for (const trialSession of trialSessions) {
    push(getJstDateKey(trialSession.datetime), {
      id: trialSession.id,
      time: formatTimeOnly(trialSession.datetime),
      label: "体験会",
      href: `/admin/trial#trial-${trialSession.id}`,
      kind: "trial",
    });
  }

  return eventsByDate;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const { year, month } = parseYearMonth(ym);
  const [admin, eventsByDate] = await Promise.all([
    getCurrentAdmin(),
    getCalendarEvents(year, month),
  ]);

  const todayKey = getJstDateKey(new Date());
  const currentYm = `${year}-${pad(month)}`;
  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const prevYm = `${prev.year}-${pad(prev.month)}`;
  const nextYm = `${next.year}-${pad(next.month)}`;

  const total = daysInMonth(year, month);
  const leadingBlanks = weekdayOfDateKey(`${year}-${pad(month)}-01`);
  const cells: ({ day: number; dateKey: string } | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: total }, (_, i) => ({
      day: i + 1,
      dateKey: `${year}-${pad(month)}-${pad(i + 1)}`,
    })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">カレンダー</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/lessons"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            予約・レッスン管理
          </Link>
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会管理
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/admin?ym=${prevYm}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            ← {prev.month}月
          </Link>
          <span className="rounded-md bg-slate-900 px-4 py-1.5 font-semibold text-white">
            {year}年 {month}月
          </span>
          <Link
            href={`/admin?ym=${nextYm}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            {next.month}月 →
          </Link>
        </div>

        <form method="get" className="flex items-center gap-2 text-sm">
          <input
            type="month"
            name="ym"
            defaultValue={currentYm}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            表示
          </button>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed border-collapse overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <thead>
            <tr>
              {WEEKDAY_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={
                    "border-b border-slate-100 px-2 py-2 text-xs font-medium " +
                    (i === 0 ? "text-rose-500" : i === 6 ? "text-sky-600" : "text-slate-400")
                  }
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((cell, dayIndex) => {
                  if (!cell) {
                    return (
                      <td
                        key={dayIndex}
                        className="h-24 border border-slate-100 bg-slate-50 align-top"
                      />
                    );
                  }
                  const events = eventsByDate.get(cell.dateKey) ?? [];
                  const isToday = cell.dateKey === todayKey;
                  return (
                    <td
                      key={dayIndex}
                      className={
                        "h-24 border border-slate-100 p-1 align-top " +
                        (isToday ? "bg-sky-50" : "")
                      }
                    >
                      <p
                        className={
                          "px-1 text-xs font-semibold " +
                          (isToday ? "text-sky-700" : "text-slate-500")
                        }
                      >
                        {cell.day}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {events.map((event) => (
                          <Link
                            key={`${event.kind}-${event.id}`}
                            href={event.href}
                            className={
                              "block truncate rounded px-1 py-0.5 text-[11px] leading-tight hover:opacity-80 " +
                              (event.kind === "lesson"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-amber-100 text-amber-700")
                            }
                          >
                            {event.time} {event.label}
                          </Link>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-sky-100" />
          レッスン
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-100" />
          体験会
        </span>
      </div>
    </div>
  );
}
