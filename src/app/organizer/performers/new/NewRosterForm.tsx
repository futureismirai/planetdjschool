"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventOption = { id: string; name: string; date: string | null };

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
const labelClass = "block text-[11px] font-medium text-slate-500";

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}/${m}/${d}`;
}

export function NewRosterForm({ events }: { events: EventOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [source, setSource] = useState<"manual" | "import">("manual");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyImportName(id: string) {
    const event = events.find((e) => e.id === id);
    if (event) {
      setName(`${formatEventDate(event.date)} ${event.name}`.trim());
    }
  }

  function handleSourceChange(next: "manual" | "import") {
    setSource(next);
    if (next === "import" && eventId) {
      applyImportName(eventId);
    }
  }

  function handleEventIdChange(id: string) {
    setEventId(id);
    applyImportName(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (source === "import" && !eventId) {
      setError("引用元のイベントを選択してください。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/organizer/performer-rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "出演者一覧",
          importFromEventId: source === "import" ? eventId : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました。");
        return;
      }
      router.push(`/organizer/performers/${data.roster.id}`);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="rounded-md bg-rose-50 p-2 text-xs text-rose-600">{error}</p>}

      <div>
        <label className={labelClass}>一覧の名前</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 〇〇イベント 出演者一覧"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>作成方法</label>
        <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
          <input
            type="radio"
            name="source"
            checked={source === "manual"}
            onChange={() => handleSourceChange("manual")}
          />
          新規作成（完全に手入力）
        </label>
        <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
          <input
            type="radio"
            name="source"
            checked={source === "import"}
            onChange={() => handleSourceChange("import")}
            disabled={events.length === 0}
          />
          タイムテーブルの情報から引用する
        </label>
        {source === "import" && (
          <div className="pl-6">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400">引用できるイベントがまだありません。</p>
            ) : (
              <select value={eventId} onChange={(e) => handleEventIdChange(e.target.value)} className={inputClass}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                    {event.date ? `（${event.date}）` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "作成中..." : "作成する"}
      </button>
    </form>
  );
}
