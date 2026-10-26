import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { DebutEventManager } from "./DebutEventManager";

export const dynamic = "force-dynamic";

async function getDebutEventsWithParticipants() {
  const events = await prisma.debutEvent.findMany({
    orderBy: { startDatetime: "desc" },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    startDatetime: event.startDatetime.toISOString(),
    endDatetime: event.endDatetime.toISOString(),
    venue: event.venue,
    participants: event.participants.map((p) => ({
      id: p.id,
      studentName: p.studentName,
      studentEmail: p.studentEmail,
      djName: p.djName,
      status: p.status,
      source: p.source,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminDebutEventsPage() {
  const [admin, events] = await Promise.all([getCurrentAdmin(), getDebutEventsWithParticipants()]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">デビューイベント</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            生徒には表示されません。イベントの枠を作成し、参加する生徒を管理します。イベント出演案内メールの回答ページから送られた回答もここに反映されます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            カレンダー
          </Link>
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会
          </Link>
          <Link
            href="/admin/lessons"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            グループレッスン
          </Link>
          <Link
            href="/admin/individual"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            個別レッスン
          </Link>
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            レッスン進捗
          </Link>
          <Link
            href="/admin/form-responses"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会アンケート
          </Link>
          <Link
            href="/admin/post-course-survey"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            受講後アンケート
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6">
        <DebutEventManager events={events} />
      </div>
    </div>
  );
}
