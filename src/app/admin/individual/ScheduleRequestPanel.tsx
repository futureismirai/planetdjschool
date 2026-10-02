"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatLessonDateTime, formatDateOnly, formatTimeOnly } from "@/lib/date";
import { INSTRUCTOR_NAME_OPTIONS } from "@/lib/constants";
import {
  LessonForm,
  emptyLessonForm,
  toDatetimeLocalValue,
  type LessonFormValues,
} from "./IndividualLessonManager";

export type ScheduleCandidateItem = {
  id: string;
  startDatetime: string; // ISO文字列
  endDatetime: string; // ISO文字列
};

export type ScheduleRequestItem = {
  id: string;
  token: string;
  studentName: string;
  studentEmail: string;
  instructorName: string | null;
  windowStart: string; // ISO文字列
  windowEnd: string; // ISO文字列
  note: string | null;
  status: string;
  confirmedDatetime: string | null;
  candidates: ScheduleCandidateItem[];
};

function NewRequestForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schedule-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, studentEmail, instructorName: instructorName || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。");
        return;
      }
      router.refresh();
      onDone();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
    >
      <input
        type="text"
        required
        placeholder="生徒名(必須)"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <input
        type="email"
        required
        placeholder="メールアドレス(必須)"
        value={studentEmail}
        onChange={(e) => setStudentEmail(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <select
        value={instructorName}
        onChange={(e) => setInstructorName(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        <option value="">担当講師(任意)</option>
        {INSTRUCTOR_NAME_OPTIONS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "送信中..." : "メールを送信"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        キャンセル
      </button>
      {error && (
        <p className="col-span-full rounded-md bg-rose-50 p-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function ConfirmCandidateForm({
  scheduleRequest,
  candidate,
  onDone,
}: {
  scheduleRequest: ScheduleRequestItem;
  candidate: ScheduleCandidateItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial: LessonFormValues = {
    ...emptyLessonForm(),
    datetime: toDatetimeLocalValue(candidate.startDatetime),
    instructorName: scheduleRequest.instructorName ?? "",
  };

  async function handleSubmit(values: LessonFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const lessonRes = await fetch("/api/admin/individual-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          datetime: new Date(values.datetime).toISOString(),
          instructorName: values.instructorName,
          location: values.location,
        }),
      });
      const lessonData = await lessonRes.json().catch(() => ({}));
      if (!lessonRes.ok) {
        setError(lessonData.error ?? "レッスンの作成に失敗しました。");
        return;
      }

      const participantRes = await fetch("/api/admin/individual-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          individualLessonId: lessonData.individualLesson.id,
          studentName: scheduleRequest.studentName,
          studentEmail: scheduleRequest.studentEmail,
          note: scheduleRequest.note,
        }),
      });
      const participantData = await participantRes.json().catch(() => ({}));
      if (!participantRes.ok) {
        setError(participantData.error ?? "生徒の登録に失敗しました。");
        return;
      }

      const confirmRes = await fetch(`/api/admin/schedule-requests/${scheduleRequest.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const confirmData = await confirmRes.json().catch(() => ({}));
      if (!confirmRes.ok) {
        setError(confirmData.error ?? "確定状態の記録に失敗しました。");
        return;
      }

      router.refresh();
      onDone();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-sky-300 bg-sky-50 p-3">
      <p className="mb-2 text-xs font-medium text-sky-700">
        この候補で個別レッスンを作成し、{scheduleRequest.studentName}
        さんを登録します。レッスン名・講師・場所を確認のうえ確定してください。
      </p>
      {error && (
        <p className="mb-2 rounded-md bg-rose-50 p-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
      <LessonForm
        initial={initial}
        submitLabel="この内容で確定する"
        submitting={submitting}
        onCancel={onDone}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function DeleteRequestButton({ requestId, studentName }: { requestId: string; studentName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${studentName}」さんへの日程調整依頼を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/schedule-requests/${requestId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      window.alert("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}

export function ScheduleRequestPanel({ requests }: { requests: ScheduleRequestItem[] }) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmingCandidateId, setConfirmingCandidateId] = useState<string | null>(null);

  const sorted = [...requests].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return new Date(b.windowStart).getTime() - new Date(a.windowStart).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold text-slate-900">日程調整</h2>
        {showNewForm ? (
          <NewRequestForm onDone={() => setShowNewForm(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            ＋ 日程調整メールを送信
          </button>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
          {sorted.map((req) => (
            <div key={req.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {req.studentName}
                    <span className="ml-2 text-xs font-normal text-slate-400">{req.studentEmail}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    回答期間: {formatDateOnly(new Date(req.windowStart))}〜
                    {formatDateOnly(new Date(new Date(req.windowEnd).getTime() - 24 * 60 * 60 * 1000))}
                    {req.instructorName && <> ／ 講師: {req.instructorName}</>}
                  </p>
                  {req.note && <p className="mt-0.5 text-xs text-slate-500">備考: {req.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "rounded-full px-3 py-1 text-xs font-semibold " +
                      (req.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : req.candidates.length > 0
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-500")
                    }
                  >
                    {req.status === "confirmed"
                      ? "確定済み"
                      : req.candidates.length > 0
                        ? `回答あり(${req.candidates.length}件)`
                        : "回答待ち"}
                  </span>
                  <DeleteRequestButton requestId={req.id} studentName={req.studentName} />
                </div>
              </div>

              {req.status === "confirmed" && req.confirmedDatetime && (
                <p className="mt-2 text-sm text-slate-600">
                  確定日時: {formatLessonDateTime(new Date(req.confirmedDatetime))}
                </p>
              )}

              {req.status === "pending" && req.candidates.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {req.candidates.map((c) => (
                    <li key={c.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                        <span>
                          {formatDateOnly(new Date(c.startDatetime))} {formatTimeOnly(new Date(c.startDatetime))}
                          〜{formatTimeOnly(new Date(c.endDatetime))}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmingCandidateId(c.id)}
                          className="text-xs font-medium text-sky-600 hover:text-sky-700"
                        >
                          この候補で確定
                        </button>
                      </div>
                      {confirmingCandidateId === c.id && (
                        <ConfirmCandidateForm
                          scheduleRequest={req}
                          candidate={c}
                          onDone={() => setConfirmingCandidateId(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
