"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function todayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CreateEventButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const eventRes = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新しいイベント" }),
      });
      const eventData = await eventRes.json().catch(() => ({}));
      if (!eventRes.ok) {
        setError(eventData.error ?? "イベントの作成に失敗しました。");
        return;
      }
      const eventId = eventData.event.id as string;

      const dayRes = await fetch(`/api/organizer/events/${eventId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayLocalDate() }),
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
        body: JSON.stringify({ startTime: "18:00", endTime: "23:00" }),
      });
      const floorData = await floorRes.json().catch(() => ({}));
      if (!floorRes.ok) {
        setError(floorData.error ?? "フロアの作成に失敗しました。");
        return;
      }
      const floorId = floorData.floor.id as string;

      const generateRes = await fetch(`/api/organizer/floors/${floorId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rounding: "5min",
          performers: [{ name: "出演者1" }, { name: "出演者2" }, { name: "出演者3" }],
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
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="block w-full rounded-md bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {creating ? "作成中..." : "＋ 新しいイベントを作成"}
      </button>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
