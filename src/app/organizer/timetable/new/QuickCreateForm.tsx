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
  { value: "5min", label: "5分単位" },
  { value: "10min", label: "10分単位" },
];

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
const labelClass = "block text-[11px] font-medium text-slate-500";

export function QuickCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [rounding, setRounding] = useState<"none" | "5min" | "10min">("none");
  const [performers, setPerformers] = useState<PerformerRow[]>([newPerformerRow()]);
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
    <form onSubmit={handleSubmit} className="space-y-2">
      {error && <p className="rounded-md bg-rose-50 p-2 text-xs text-rose-600">{error}</p>}

      <div>
        <label className={labelClass}>イベント名</label>
        <input type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className={labelClass}>開催日</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>開始</label>
          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>終了</label>
          <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[11px] font-medium text-slate-500">区切り方</label>
        <select
          value={rounding}
          onChange={(e) => setRounding(e.target.value as typeof rounding)}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {ROUNDING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        {performers.map((p, i) => (
          <div key={p.key} className="rounded-md border border-slate-200 bg-slate-50 p-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-right text-[11px] text-slate-400">{i + 1}</span>
              <input
                type="text"
                placeholder="出演者名"
                value={p.name}
                onChange={(e) => updateRow(p.key, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => removeRow(p.key)}
                aria-label="削除"
                className="shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
              >
                ✕
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-[22px]">
              <input
                type="text"
                placeholder="SNS（任意・@なし）"
                value={p.sns}
                onChange={(e) => updateRow(p.key, { sns: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                <input type="checkbox" checked={p.useFixed} onChange={(e) => updateRow(p.key, { useFixed: e.target.checked })} />
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
                    className="w-14 rounded-md border border-slate-300 px-1.5 py-1 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="text-[11px] text-slate-400">分</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPerformers((rows) => [...rows, newPerformerRow()])}
          className="w-full rounded-md border border-dashed border-slate-300 py-1.5 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700"
        >
          ＋ 出演者を追加
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "作成中..." : "タイムテーブルを作成する"}
      </button>
    </form>
  );
}
