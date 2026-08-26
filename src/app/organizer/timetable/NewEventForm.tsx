"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewEventForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        ＋ 新しいイベントを作成
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const eventRes = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const eventData = await eventRes.json().catch(() => ({}));
      if (!eventRes.ok) {
        setError(eventData.error ?? "作成に失敗しました。");
        return;
      }
      const eventId = eventData.event.id as string;

      const dayRes = await fetch(`/api/organizer/events/${eventId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const dayData = await dayRes.json().catch(() => ({}));
      if (!dayRes.ok) {
        setError(dayData.error ?? "開催日の作成に失敗しました。");
        router.push(`/organizer/timetable/${eventId}`);
        return;
      }

      router.push(`/organizer/timetable/${eventId}`);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-slate-500">イベント名</label>
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">開催日</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          複数日開催の場合も、まず1日目を入力してください。あとから追加できます。
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "作成中..." : "作成してタイムテーブル作成へ"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
