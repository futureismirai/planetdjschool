"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PerformerRow = {
  key: string;
  name: string;
  sns: string;
  useFixed: boolean;
  fixedDurationMinutes: string;
};

function newPerformerRow(): PerformerRow {
  return {
    key: Math.random().toString(36).slice(2),
    name: "",
    sns: "",
    useFixed: false,
    fixedDurationMinutes: "",
  };
}

const ROUNDING_OPTIONS: { value: "none" | "5min" | "10min"; label: string }[] = [
  { value: "none", label: "均等割り" },
  { value: "5min", label: "ほぼ均等（5分単位）" },
  { value: "10min", label: "ほぼ均等（10分単位）" },
];

export function QuickCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [rounding, setRounding] = useState<"none" | "5min" | "10min">("none");
  const [performers, setPerformers] = useState<PerformerRow[]>([newPerformerRow(), newPerformerRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(key: string, patch: Partial<PerformerRow>) {
    setPerformers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setPerformers((rows) => rows.filter((r) => r.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const names = performers.filter((p) => p.name.trim());
    if (names.length === 0) {
      setError("出演者を1名以上入力してください。");
      return;
    }
    setSubmitting(true);
    let eventId: string | null = null;
    try {
      const eventRes = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const eventData = await eventRes.json().catch(() => ({}));
      if (!eventRes.ok) {
        setError(eventData.error ?? "イベントの作成に失敗しました。");
        return;
      }
      eventId = eventData.event.id as string;

      const dayRes = await fetch(`/api/organizer/events/${eventId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const dayData = await dayRes.json().catch(() => ({}));
      if (!dayRes.ok) {
        setError(dayData.error ?? "開催日の作成に失敗しました。");
        return;
      }
      const dayId = dayData.day.id as string;

      const floorRes = await fetch(`/api/organizer/days/${dayId}/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      const floorData = await floorRes.json().catch(() => ({}));
      if (!floorRes.ok) {
        setError(floorData.error ?? "時間の設定に失敗しました。");
        return;
      }
      const floorId = floorData.floor.id as string;

      const generateRes = await fetch(`/api/organizer/floors/${floorId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rounding,
          performers: names.map((p) => ({
            name: p.name,
            snsHandle: p.sns || undefined,
            fixedDurationMinutes: p.useFixed && p.fixedDurationMinutes ? Number(p.fixedDurationMinutes) : undefined,
          })),
        }),
      });
      const generateData = await generateRes.json().catch(() => ({}));
      if (!generateRes.ok) {
        setError(generateData.error ?? "タイムテーブルの作成に失敗しました。");
        return;
      }

      router.push(`/organizer/timetable/${eventId}`);
    } catch {
      setError("通信エラーが発生しました。");
      if (eventId) router.push(`/organizer/timetable/${eventId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
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
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">開始</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">終了</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500">区切り方</label>
          <select
            value={rounding}
            onChange={(e) => setRounding(e.target.value as typeof rounding)}
            className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {ROUNDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs font-medium text-slate-600">
          出演者（出演順に入力。出演時間を固定したい場合は「時間固定」にチェックして分数を入力）
        </p>
        <div className="space-y-2">
          {performers.map((p, i) => (
            <div key={p.key} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
              <span className="w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}</span>
              <input
                type="text"
                placeholder="出演者名"
                value={p.name}
                onChange={(e) => updateRow(p.key, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <input
                type="text"
                placeholder="Instagram等（任意・@なし）"
                value={p.sns}
                onChange={(e) => updateRow(p.key, { sns: e.target.value })}
                className="w-40 min-w-0 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={p.useFixed}
                  onChange={(e) => updateRow(p.key, { useFixed: e.target.checked })}
                />
                時間固定
              </label>
              {p.useFixed && (
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    placeholder="分"
                    value={p.fixedDurationMinutes}
                    onChange={(e) => updateRow(p.key, { fixedDurationMinutes: e.target.value })}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="text-xs text-slate-400">分</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeRow(p.key)}
                className="shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
              >
                削除
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPerformers((rows) => [...rows, newPerformerRow()])}
          className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700"
        >
          ＋ 出演者を追加
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "作成中..." : "タイムテーブルを作成する"}
      </button>
    </form>
  );
}
