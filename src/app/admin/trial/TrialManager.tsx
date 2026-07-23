"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatLessonDateTime } from "@/lib/date";

export type TrialParticipantItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  note: string | null;
  createdAt: string;
};

export type TrialSessionItem = {
  id: string;
  datetime: string; // ISO文字列
  instructorName: string;
  maxSlots: number;
  participants: TrialParticipantItem[];
};

type SessionFormValues = {
  datetime: string; // datetime-local用の文字列
  instructorName: string;
  maxSlots: string;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptySessionForm(): SessionFormValues {
  return { datetime: "", instructorName: "", maxSlots: "3" };
}

function sessionToForm(session: TrialSessionItem): SessionFormValues {
  return {
    datetime: toDatetimeLocalValue(session.datetime),
    instructorName: session.instructorName,
    maxSlots: String(session.maxSlots),
  };
}

function SessionForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: SessionFormValues;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: SessionFormValues) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500">日時</label>
        <input
          type="datetime-local"
          required
          value={values.datetime}
          onChange={(e) => setValues({ ...values, datetime: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">参加講師</label>
        <input
          type="text"
          required
          value={values.instructorName}
          onChange={(e) => setValues({ ...values, instructorName: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">定員</label>
        <input
          type="number"
          min={1}
          required
          value={values.maxSlots}
          onChange={(e) => setValues({ ...values, maxSlots: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "保存中..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

function ParticipantForm({
  trialSessionId,
  onDone,
}: {
  trialSessionId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trial-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialSessionId, studentName, studentEmail, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      setStudentName("");
      setStudentEmail("");
      setNote("");
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
      className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
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
      <input
        type="text"
        placeholder="備考(任意)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "追加中..." : "追加する"}
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

function DeleteParticipantButton({
  participantId,
  studentName,
}: {
  participantId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${studentName}」さんの参加登録を本当に削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/trial-participants/${participantId}`, {
        method: "DELETE",
      });
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

export function TrialManager({ sessions }: { sessions: TrialSessionItem[] }) {
  const router = useRouter();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [addingParticipantFor, setAddingParticipantFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();

  async function handleCreateSession(values: SessionFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/trial-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: new Date(values.datetime).toISOString(),
          instructorName: values.instructorName,
          maxSlots: Number(values.maxSlots),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      setShowNewForm(false);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateSession(id: string, values: SessionFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trial-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: new Date(values.datetime).toISOString(),
          instructorName: values.instructorName,
          maxSlots: Number(values.maxSlots),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました。");
        return;
      }
      setEditingSessionId(null);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSession(session: TrialSessionItem) {
    const message =
      session.participants.length > 0
        ? `この体験会には${session.participants.length}名の参加登録があります。削除すると参加者データも一緒に削除されます。本当に削除しますか？`
        : "この体験会を削除しますか？";
    if (!window.confirm(message)) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trial-sessions/${session.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {showNewForm ? (
          <SessionForm
            initial={emptySessionForm()}
            submitLabel="登録する"
            submitting={submitting}
            onCancel={() => setShowNewForm(false)}
            onSubmit={handleCreateSession}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            ＋ 新しい体験会を追加
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sessions.length === 0 && (
          <p className="text-sm text-slate-500">体験会が登録されていません。</p>
        )}

        {sessions.map((session) => {
          const isPast = new Date(session.datetime) < now;

          if (editingSessionId === session.id) {
            return (
              <div
                key={session.id}
                className="rounded-lg border border-sky-300 bg-white p-4 shadow-sm"
              >
                <SessionForm
                  initial={sessionToForm(session)}
                  submitLabel="更新する"
                  submitting={submitting}
                  onCancel={() => setEditingSessionId(null)}
                  onSubmit={(values) => handleUpdateSession(session.id, values)}
                />
              </div>
            );
          }

          return (
            <section
              key={session.id}
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                <div>
                  <p className="flex items-center gap-2 font-bold text-slate-900">
                    {formatLessonDateTime(new Date(session.datetime))}
                    {isPast && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                        終了
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    参加講師: {session.instructorName} ／ 定員: {session.maxSlots} ／ 参加:{" "}
                    {session.participants.length}名
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSessionId(session.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(session)}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    削除
                  </button>
                </div>
              </div>

              {session.participants.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">参加登録はまだありません。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400">
                        <th className="px-4 py-2 font-medium">生徒名</th>
                        <th className="px-4 py-2 font-medium">メールアドレス</th>
                        <th className="px-4 py-2 font-medium">備考</th>
                        <th className="px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.participants.map((participant) => (
                        <tr key={participant.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2">{participant.studentName}</td>
                          <td className="px-4 py-2">{participant.studentEmail}</td>
                          <td className="px-4 py-2 text-slate-500">{participant.note ?? "-"}</td>
                          <td className="px-4 py-2 text-right">
                            <DeleteParticipantButton
                              participantId={participant.id}
                              studentName={participant.studentName}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {addingParticipantFor === session.id ? (
                <ParticipantForm
                  trialSessionId={session.id}
                  onDone={() => setAddingParticipantFor(null)}
                />
              ) : (
                <div className="border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={() => setAddingParticipantFor(session.id)}
                    className="text-sm font-medium text-sky-600 hover:text-sky-700"
                  >
                    ＋ 生徒を追加
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
