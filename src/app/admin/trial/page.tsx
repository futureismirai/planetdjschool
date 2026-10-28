import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNavMenu } from "../AdminNavMenu";
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
    location: session.location,
    participants: session.participants.map((p) => ({
      id: p.id,
      studentName: p.studentName,
      studentEmail: p.studentEmail,
      note: p.note,
      thankYouEmailSentAt: p.thankYouEmailSentAt ? p.thankYouEmailSentAt.toISOString() : null,
      membershipEmailSentAt: p.membershipEmailSentAt ? p.membershipEmailSentAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminTrialPage() {
  const [admin, sessions] = await Promise.all([
    getCurrentAdmin(),
    getTrialSessionsWithParticipants(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">体験会</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            生徒には表示されません。管理者専用のページです。定員は1回あたり最大3名です。
          </p>
        </div>
        <AdminNavMenu />
      </div>

      <div className="mt-6">
        <TrialManager sessions={sessions} />
      </div>
    </div>
  );
}
