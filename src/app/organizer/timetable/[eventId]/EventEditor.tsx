"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FloorEditor, type FloorData } from "./FloorEditor";

export type DayData = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string | null;
  floors: FloorData[];
};

export type EventData = {
  id: string;
  name: string;
  memo: string | null;
  days: DayData[];
};

function formatDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
  return `${y}/${m}/${d}（${weekday}）`;
}

function AddDayForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-700"
      >
        ＋ 開催日を追加
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "追加に失敗しました。");
        return;
      }
      setOpen(false);
      setDate("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-slate-500">日付</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
      >
        {submitting ? "追加中..." : "追加"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        キャンセル
      </button>
    </form>
  );
}

function AddFloorForm({ dayId, defaultOpen = false }: { dayId: string; defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-700"
      >
        ＋ フロアを追加
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/days/${dayId}/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startTime, endTime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "追加に失敗しました。");
        return;
      }
      setOpen(false);
      setName("");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-slate-500">フロア名（任意）</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="未入力の場合は自動で名付けられます"
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">開始</label>
        <input
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">終了</label>
        <input
          type="time"
          required
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
      >
        {submitting ? "追加中..." : "追加"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        キャンセル
      </button>
    </form>
  );
}

function DayCard({ eventName, day }: { eventName: string; day: DayData }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [date, setDate] = useState(day.date);
  const [error, setError] = useState<string | null>(null);
  const currentDayLabel = day.label ? `${day.label}（${formatDateJa(day.date)}）` : formatDateJa(day.date);

  async function handleSaveDay(patch: { date?: string }) {
    setError(null);
    const res = await fetch(`/api/organizer/days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: patch.date ?? date, label: day.label }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました。");
      return;
    }
    router.refresh();
  }

  async function handleDeleteDay() {
    if (!window.confirm(`「${currentDayLabel}」を削除しますか？フロア・タイムテーブルもすべて削除されます。`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/days/${day.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={(e) => handleSaveDay({ date: e.target.value })}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <button
          type="button"
          onClick={handleDeleteDay}
          disabled={deleting}
          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          この日を削除
        </button>
      </div>
      <div className="space-y-4 p-3">
        {day.floors.map((floor) => (
          <FloorEditor
            key={floor.id}
            floor={floor}
            eventName={eventName}
            dayLabel={currentDayLabel}
            showFloorName={day.floors.length > 1}
          />
        ))}
        <AddFloorForm dayId={day.id} defaultOpen={day.floors.length === 0} />
      </div>
    </section>
  );
}

function EventNameField({ event }: { event: EventData }) {
  const router = useRouter();
  const [name, setName] = useState(event.name);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(value: string) {
    setError(null);
    const res = await fetch(`/api/organizer/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value, memo: event.memo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました。");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => handleSave(e.target.value)}
        placeholder="イベント名"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xl font-bold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function EventEditor({ event }: { event: EventData }) {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/organizer/timetable" className="text-xs text-slate-400 hover:text-slate-600">
          ← イベント一覧に戻る
        </Link>
        <EventNameField event={event} />
        {event.memo && <p className="mt-1 text-sm text-slate-500">{event.memo}</p>}
      </div>

      <div className="space-y-4">
        {event.days.length === 0 && (
          <p className="text-sm text-slate-500">まだ開催日が登録されていません。開催日を追加してください。</p>
        )}
        {event.days.map((day) => (
          <DayCard key={day.id} eventName={event.name} day={day} />
        ))}
        <AddDayForm eventId={event.id} />
      </div>
    </div>
  );
}
