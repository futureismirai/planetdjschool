"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatLessonDateTime } from "@/lib/date";

export const DEFAULT_LOCATION = "ゲートウェイスタジオ渋谷道玄坂店　3階　5st";

export type LessonItem = {
  id: string;
  name: string;
  datetime: string; // ISO文字列
  instructorName: string;
  maxSlots: number;
  location: string | null;
  bookingCount: number;
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
        <input
          type="text"
          required
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Lesson1"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
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

export function LessonManager({ lessons }: { lessons: LessonItem[] }) {
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
      lesson.bookingCount > 0
        ? `「${lesson.name}」には${lesson.bookingCount}件の予約が入っています。削除すると予約データも一緒に削除されます。本当に削除しますか？`
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

      <div className="space-y-3">
        {lessons.length === 0 && (
          <p className="text-sm text-slate-500">レッスンが登録されていません。</p>
        )}
        {lessons.map((lesson) => {
          const isPast = new Date(lesson.datetime) < now;
          if (editingId === lesson.id) {
            return (
              <div
                key={lesson.id}
                className="rounded-lg border border-sky-300 bg-white p-4 shadow-sm"
              >
                <LessonForm
                  initial={lessonToForm(lesson)}
                  submitLabel="更新する"
                  submitting={submitting}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(values) => handleUpdate(lesson.id, values)}
                />
              </div>
            );
          }
          return (
            <div
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  {lesson.name}
                  {isPast && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                      終了
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatLessonDateTime(new Date(lesson.datetime))} ／ 講師: {lesson.instructorName}{" "}
                  ／ 定員: {lesson.maxSlots} ／ 予約: {lesson.bookingCount}件
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  場所: {lesson.location ?? DEFAULT_LOCATION}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
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
          );
        })}
      </div>
    </div>
  );
}
