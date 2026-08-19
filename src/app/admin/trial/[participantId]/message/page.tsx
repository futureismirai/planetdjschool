import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../../../LogoutButton";
import { buildTrialThankYouDefaultText } from "@/lib/emailTemplates";
import { TrialThankYouMessageForm } from "./TrialThankYouMessageForm";

export const dynamic = "force-dynamic";

export default async function TrialThankYouMessagePage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;

  const [admin, participant] = await Promise.all([
    getCurrentAdmin(),
    prisma.trialParticipant.findUnique({
      where: { id: participantId },
      include: { trialSession: true },
    }),
  ]);

  if (!participant) {
    notFound();
  }

  const defaultText = buildTrialThankYouDefaultText(
    participant.studentName,
    participant.trialSession.instructorName
  );

  return (
    <div className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">お礼メール送信</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {participant.studentName} 様 ({participant.studentEmail})
          </p>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会一覧に戻る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6">
        <TrialThankYouMessageForm
          participantId={participant.id}
          studentName={participant.studentName}
          defaultText={defaultText}
        />
      </div>
    </div>
  );
}
