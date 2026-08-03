"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatDateHeading,
  formatLessonDateTime,
  formatTimeOnly,
  sortForDateGroupedDisplay,
  withDateGroupFlags,
} from "@/lib/date";
import { ManualBookingForm } from "./ManualBookingForm";
import { DeleteBookingButton } from "./DeleteBookingButton";

export const DEFAULT_LOCATION = "ゲートウェイスタジオ渋谷道玄坂店　3階　5st";

export const LESSON_NAME_OPTIONS = [
  "Lesson 1",
  "Lesson 2",
  "Lesson 3",
  "Lesson 4",
  "Lesson 5",
  "未定",
] as const;

export type BookingItem = {
  id: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  note: string | null;
  createdAt: string;
};

export type LessonItem = {
  id: string;
  name: string;
  datetime: string; // ISO文字列
  instructorName: string;
  maxSlots: number;
  location: string | null;
  bookings: BookingItem[];
};

type FormValues = {
  name: string;
  datetime: string; // datetime-local用の文字列
  instructorName: string;
  maxSlots: string;
  location: string;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormValues {
  return { name: "", datetime: "", instructorName: "", maxSlots: "3", location: DEFAULT_LOCATION };
}

function lessonToForm(lesson: LessonItem): FormValues {
  return {
    name: lesson.name,
    datetime: toDatetimeLocalValue(lesson.datetime),
    instructorName: lesson.instructorName,
    maxSlots: String(lesson.maxSlots),
    location: lesson.location ?? DEFAULT_LOCATION,
  };
}

function LessonForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: FormValues;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <div>
        <label className="block text-xs font-medium text-slate-500">レッスン名</label>
        <select
          required
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {LESSON_NAME_OPTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
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
        <label className="block text-xs font-medium text-slate-500">講師名</label>
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
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-500">場所</label>
        <input
          type="text"
          value={values.location}
          onChange={(e) => setValues({ ...values, location: e.target.value })}
          placeholder={DEFAULT_LOCATION}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
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

export function LessonBookingManager({ lessons }: { lessons: LessonItem[] }) {
  const router = useRouter();
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const now = new Date();

  async function handleCreate(values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          datetime: new Date(values.datetime).toISOString(),
          instructorName: values.instructorName,
          maxSlots: Number(values.maxSlots),
          location: values.location,
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

  async function handleUpdate(id: string, values: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          datetime: new Date(values.datetime).toISOString(),
          instructorName: values.instructorName,
          maxSlots: Number(values.maxSlots),
          location: values.location,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました。");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(lesson: LessonItem) {
    const message =
      lesson.bookings.length > 0
        ? `「${lesson.name}」には${lesson.bookings.length}件の予約が入っています。削除すると予約データも一緒に削除されます。本当に削除しますか？`
        : `「${lesson.name}」を削除しますか？`;
    if (!window.confirm(message)) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
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
          <LessonForm
            initial={emptyForm()}
            submitLabel="登録する"
            submitting={submitting}
            onCancel={() => setShowNewForm(false)}
            onSubmit={handleCreate}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            ＋ 新しいレッスンを追加
          </button>
        )}
      </div>

      <div>
        {lessons.length === 0 && (
          <p className="text-sm text-slate-500">レッスンが登録されていません。</p>
        )}

        {withDateGroupFlags(
          sortForDateGroupedDisplay(lessons, (l) => new Date(l.datetime)),
          (l) => new Date(l.datetime)
        ).map(
          ({ item: lesson, isNewDate }, index) => {
            const isPast = new Date(lesson.datetime) < now;
            const remainingSlots = lesson.maxSlots - lesson.bookings.length;
            const dateHeader = isNewDate && (
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-slate-800 px-3 py-1 text-sm font-bold text-white">
                  {formatDateHeading(new Date(lesson.datetime))}
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            );

            if (editingId === lesson.id) {
              return (
                <div key={lesson.id} className={index === 0 ? "" : isNewDate ? "mt-6" : "mt-3"}>
                  {dateHeader}
                  <div className="rounded-lg border border-sky-300 bg-white p-4 shadow-sm">
                    <LessonForm
                      initial={lessonToForm(lesson)}
                      submitLabel="更新する"
                      submitting={submitting}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(values) => handleUpdate(lesson.id, values)}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={lesson.id} className={index === 0 ? "" : isNewDate ? "mt-6" : "mt-3"}>
                {dateHeader}
                <section
                  id={`lesson-${lesson.id}`}
                  className="scroll-mt-4 rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        {lesson.name}
                        {isPast && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                            終了
                          </span>
                        )}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-500">
                          {formatTimeOnly(new Date(lesson.datetime))}〜
                        </span>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          講師: {lesson.instructorName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        場所: {lesson.location ?? DEFAULT_LOCATION}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                        予約 {lesson.bookings.length} / {lesson.maxSlots}（残り
                        {Math.max(remainingSlots, 0)}）
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(lesson.id)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(lesson)}
                        className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        削除
                      </button>
                    </div>
                  </div>

              {lesson.bookings.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">予約はまだありません。</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400">
                        <th className="px-2 py-2 font-medium sm:px-4">生徒名</th>
                        <th className="px-2 py-2 font-medium sm:px-4">メールアドレス</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">電話番号</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">備考</th>
                        <th className="hidden px-4 py-2 font-medium sm:table-cell">予約日時</th>
                        <th className="px-2 py-2 font-medium sm:px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-2 sm:px-4">
                            {booking.studentEmail ? (
                              <Link
                                href={`/admin/students/${encodeURIComponent(booking.studentEmail)}`}
                                className="text-sky-700 underline-offset-2 hover:underline"
                              >
                                {booking.studentName}
                              </Link>
                            ) : (
                              booking.studentName
                            )}
                          </td>
                          <td className="px-2 py-2 sm:px-4">{booking.studentEmail ?? "-"}</td>
                          <td className="hidden px-4 py-2 sm:table-cell">
                            {booking.studentPhone ?? "-"}
                          </td>
                          <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">
                            {booking.note ?? "-"}
                          </td>
                          <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">
                            {formatLessonDateTime(new Date(booking.createdAt))}
                          </td>
                          <td className="px-2 py-2 text-right sm:px-4">
                            <DeleteBookingButton
                              bookingId={booking.id}
                              studentName={booking.studentName}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                  <ManualBookingForm lessonId={lesson.id} />
                </section>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
