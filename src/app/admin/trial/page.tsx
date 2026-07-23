import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TrialManager } from "./TrialManager";

export const dynamic = "force-dynamic";

async function getTrialSessionsWithParticipants() {
  const sessions = await prisma.trialSession.findMany({
    orderBy: { datetime: "desc" },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    datetime: session.datetime.toISOString(),
    instructorName: session.instructorName,
    maxSlots: session.maxSlots,
    participants: session.participants.map((p) => ({
      id: p.id,
      studentName: p.studentName,
      studentEmail: p.studentEmail,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminTrialPage() {
  const sessions = await getTrialSessionsWithParticipants();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">体験会 参加者管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            生徒には表示されません。管理者専用のページです。定員は1回あたり最大3名です。
          </p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; 予約管理に戻る
        </Link>
      </div>

      <div className="mt-6">
        <TrialManager sessions={sessions} />
      </div>
    </div>
  );
}
