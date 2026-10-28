"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateHeading, formatTimeOnly, sortForDateGroupedDisplay, withDateGroupFlags } from "@/lib/date";
import { toDatetimeLocalValue } from "../individual/IndividualLessonManager";

export type DebutEventParticipantItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  djName: string | null;
  status: string;
  source: string;
  createdAt: string;
};

export type DebutEventItem = {
  id: string;
  startDatetime: string;
  endDatetime: string;
  venue: string | null;
  participants: DebutEventParticipantItem[];
};

/** グループレッスン・個別レッスンを受講している生徒。手入力フォームの名前予測候補に使用する。 */
export type StudentOption = {
  displayName: string;
  email: string;
};

type EventFormValues = {
  startDatetime: string; // datetime-local用の文字列
  endDatetime: string;
  venue: string;
};

function emptyEventForm(): EventFormValues {
  return { startDatetime: "", endDatetime: "", venue: "" };
}

function eventToForm(event: DebutEventItem): EventFormValues {
  return {
    startDatetime: toDatetimeLocalValue(event.startDatetime),
    endDatetime: toDatetimeLocalValue(event.endDatetime),
    venue: event.venue ?? "",
  };
}

function EventForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: EventFormValues;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: EventFormValues) => void;
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
        <label className="block text-xs font-medium text-slate-500">開始日時</label>
        <input
          type="datetime-local"
          required
          value={values.startDatetime}
          onChange={(e) => setValues({ ...values, startDatetime: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">終了日時</label>
        <input
          type="datetime-local"
          required
          value={values.endDatetime}
          onChange={(e) => setValues({ ...values, endDatetime: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">会場(任意)</label>
        <input
          type="text"
          value={values.venue}
          onChange={(e) => setValues({ ...values, venue: e.target.value })}
          placeholder="例）下北沢SPREAD"
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
  eventId,
  students,
  onDone,
}: {
  eventId: string;
  students: StudentOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const datalistId = `student-options-${eventId}`;

  function handleStudentNameChange(value: string) {
    setStudentName(value);
    // 候補と名前が一致したら、メールアドレスも自動で入力する(手入力の手間を減らす)。
    const match = students.find((s) => s.displayName === value);
    if (match) {
      setStudentEmail(match.email);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/debut-event-participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, studentName, studentEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      setStudentName("");
      setStudentEmail("");
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
      className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
    >
      <input
        type="text"
        required
        placeholder="生徒名(必須)"
        value={studentName}
        onChange={(e) => handleStudentNameChange(e.target.value)}
        list={datalistId}
        autoComplete="off"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <datalist id={datalistId}>
        {students.map((s) => (
          <option key={s.email} value={s.displayName} />
        ))}
      </datalist>
      <input
        type="email"
        required
        placeholder="メールアドレス(必須)"
        value={studentEmail}
        onChange={(e) => setStudentEmail(e.target.value)}
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

function DeleteParticipantButton({ participantId, studentName }: { participantId: string; studentName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${studentName}」さんの登録を本当に削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/debut-event-participants/${participantId}`, { method: "DELETE" });
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

function ParticipantList({
  title,
  participants,
  emptyText,
}: {
  title: string;
  participants: DebutEventParticipantItem[];
  emptyText: string;
}) {
  return (
    <div className="border-t border-slate-100">
      <p className="px-4 pt-3 text-xs font-semibold text-slate-500">
        {title}({participants.length}名)
      </p>
      {participants.length === 0 ? (
        <p className="px-4 pb-3 pt-1 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-2 py-2 font-medium sm:px-4">名前</th>
                <th className="px-2 py-2 font-medium sm:px-4">DJネーム</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">メールアドレス</th>
                <th className="px-2 py-2 font-medium sm:px-4"></th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-2 py-2 sm:px-4">
                    <Link
                      href={`/admin/students/${encodeURIComponent(participant.studentEmail)}`}
                      className="text-sky-700 underline-offset-2 hover:underline"
                    >
                      {participant.studentName}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-slate-600 sm:px-4">{participant.djName ?? "-"}</td>
                  <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">{participant.studentEmail}</td>
                  <td className="px-2 py-2 text-right sm:px-4">
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
    </div>
  );
}

export function DebutEventManager({
  events,
  students,
}: {
  events: DebutEventItem[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [addingParticipantFor, setAddingParticipantFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();

  async function handleCreateEvent(values: EventFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/debut-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDatetime: new Date(values.startDatetime).toISOString(),
          endDatetime: new Date(values.endDatetime).toISOString(),
          venue: values.venue,
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

  async function handleUpdateEvent(id: string, values: EventFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/debut-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDatetime: new Date(values.startDatetime).toISOString(),
          endDatetime: new Date(values.endDatetime).toISOString(),
          venue: values.venue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました。");
        return;
      }
      setEditingEventId(null);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEvent(event: DebutEventItem) {
    const message =
      event.participants.length > 0
        ? "このイベントには登録済みの生徒がいます。削除すると一緒に削除されます。本当に削除しますか？"
        : "このイベントを削除しますか？";
    if (!window.confirm(message)) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/debut-events/${event.id}`, { method: "DELETE" });
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
          <EventForm
            initial={emptyEventForm()}
            submitLabel="登録する"
            submitting={submitting}
            onCancel={() => setShowNewForm(false)}
            onSubmit={handleCreateEvent}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            ＋ 新しいイベントの枠を作成
          </button>
        )}
      </div>

      <div>
        {events.length === 0 && (
          <p className="text-sm text-slate-500">デビューイベントが登録されていません。</p>
        )}

        {withDateGroupFlags(
          sortForDateGroupedDisplay(events, (e) => new Date(e.startDatetime)),
          (e) => new Date(e.startDatetime)
        ).map(({ item: event, isNewDate }, index) => {
          const isPast = new Date(event.endDatetime) < now;
          const dateHeader = isNewDate && (
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-white">
                {formatDateHeading(new Date(event.startDatetime))}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          );

          if (editingEventId === event.id) {
            return (
              <div key={event.id} className={index === 0 ? "" : isNewDate ? "mt-6" : "mt-3"}>
                {dateHeader}
                <div className="rounded-lg border border-sky-300 bg-white p-4 shadow-sm">
                  <EventForm
                    initial={eventToForm(event)}
                    submitLabel="更新する"
                    submitting={submitting}
                    onCancel={() => setEditingEventId(null)}
                    onSubmit={(values) => handleUpdateEvent(event.id, values)}
                  />
                </div>
              </div>
            );
          }

          const participating = event.participants.filter(
            (p) => p.status === "participating" || p.status === "pending"
          );
          const declined = event.participants.filter((p) => p.status === "declined");
          const notInterested = event.participants.filter((p) => p.status === "not_interested");

          return (
            <div key={event.id} className={index === 0 ? "" : isNewDate ? "mt-6" : "mt-3"}>
              {dateHeader}
              <section className="scroll-mt-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                  <div>
                    <p className="flex items-center gap-2 font-bold text-slate-900">
                      {formatTimeOnly(new Date(event.startDatetime))}〜{formatTimeOnly(new Date(event.endDatetime))}
                      {isPast && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                          終了
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{event.venue ?? "会場未定"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      参加者 {participating.length}名
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingEventId(event.id)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event)}
                      className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      削除
                    </button>
                  </div>
                </div>

                <ParticipantList title="参加者" participants={participating} emptyText="まだ参加者がいません。" />

                {addingParticipantFor === event.id ? (
                  <ParticipantForm
                    eventId={event.id}
                    students={students}
                    onDone={() => setAddingParticipantFor(null)}
                  />
                ) : (
                  <div className="border-t border-slate-100 p-3">
                    <button
                      type="button"
                      onClick={() => setAddingParticipantFor(event.id)}
                      className="text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      ＋ 生徒を追加
                    </button>
                  </div>
                )}

                <ParticipantList
                  title="参加できない"
                  participants={declined}
                  emptyText="対象者はいません。"
                />
                <ParticipantList
                  title="参加を希望しない"
                  participants={notInterested}
                  emptyText="対象者はいません。"
                />
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
