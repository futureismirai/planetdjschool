import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteRosterButton } from "./DeleteRosterButton";

export const dynamic = "force-dynamic";

async function getRosters() {
  const rosters = await prisma.performerRoster.findMany({
    orderBy: { updatedAt: "desc" },
    include: { entries: { select: { id: true, isCategory: true } } },
  });
  return rosters.map((roster) => ({
    ...roster,
    performerCount: roster.entries.filter((e) => !e.isCategory).length,
  }));
}

export default async function PerformerRosterListPage() {
  const rosters = await getRosters();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">出演者一覧</h1>
          <p className="mt-1 text-sm text-slate-500">出演者名とSNSをまとめて管理・コピーできます。</p>
        </div>
        <Link
          href="/organizer/performers/new"
          className="shrink-0 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          ＋ 新規作成
        </Link>
      </div>

      <div className="space-y-2">
        {rosters.length === 0 && <p className="text-sm text-slate-500">一覧がまだありません。</p>}
        {rosters.map((roster) => (
          <div
            key={roster.id}
            className="relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow"
          >
            <Link href={`/organizer/performers/${roster.id}`} className="block pr-14">
              <h2 className="text-sm font-bold text-slate-900">{roster.name}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{roster.performerCount}名</p>
            </Link>
            <DeleteRosterButton rosterId={roster.id} rosterName={roster.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
