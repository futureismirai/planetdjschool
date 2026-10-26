import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../../../LogoutButton";
import { getStudents } from "@/lib/students";
import { buildEventInviteDefaultText } from "@/lib/emailTemplates";
import { EventInviteForm } from "./EventInviteForm";

export const dynamic = "force-dynamic";

export default async function EventInvitePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email).trim().toLowerCase();

  const [admin, students] = await Promise.all([getCurrentAdmin(), getStudents()]);
  const student = students.find((s) => s.email === decodedEmail);

  if (!student) {
    notFound();
  }

  const defaultText = buildEventInviteDefaultText(student.displayName);

  return (
    <div className="mx-auto max-w-2xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">イベント出演メール送信</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {student.displayName} 様 ({student.email})
          </p>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            生徒一覧に戻る
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6">
        <EventInviteForm studentEmail={student.email} defaultText={defaultText} />
      </div>
    </div>
  );
}
