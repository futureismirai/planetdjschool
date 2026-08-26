import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewRosterForm } from "./NewRosterForm";

export const dynamic = "force-dynamic";

async function getEvents() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { days: { orderBy: { date: "asc" }, select: { date: true } } },
  });
  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.days[0] ? event.days[0].date.toISOString().slice(0, 10) : null,
  }));
}

export default async function NewPerformerRosterPage() {
  const events = await getEvents();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Link href="/organizer/performers" className="text-xs text-slate-400 hover:text-slate-600">
          ← 戻る
        </Link>
        <h1 className="text-sm font-bold text-slate-900">出演者一覧表を作成</h1>
        <span className="w-8" />
      </div>
      <NewRosterForm events={events} />
    </div>
  );
}
