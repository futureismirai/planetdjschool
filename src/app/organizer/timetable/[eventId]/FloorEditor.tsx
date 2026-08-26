"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SNS_FORMAT_OPTIONS,
  formatTimetableForSns,
  slotDurationMinutes,
  type SnsFormatOptions,
} from "@/lib/timetable";

export type SlotData = {
  id: string;
  performerName: string;
  snsHandle: string | null;
  startTime: string;
  endTime: string;
  isFixed: boolean;
};

export type FloorData = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  slots: SlotData[];
};

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

function FloorHeaderFields({ floor, onSaved }: { floor: FloorData; onSaved: () => void }) {
  const [name, setName] = useState(floor.name);
  const [startTime, setStartTime] = useState(floor.startTime);
  const [endTime, setEndTime] = useState(floor.endTime);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(patch: { name?: string; startTime?: string; endTime?: string }) {
    setError(null);
    const res = await fetch(`/api/organizer/floors/${floor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patch.name ?? name,
        startTime: patch.startTime ?? startTime,
        endTime: patch.endTime ?? endTime,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました。");
      return;
    }
    onSaved();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => handleSave({ name: e.target.value })}
          placeholder="フロア名"
          className="rounded-md border border-transparent px-1 text-sm font-bold text-slate-900 hover:border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          onBlur={(e) => handleSave({ startTime: e.target.value })}
          className="rounded-md border border-transparent px-1 text-xs text-slate-500 hover:border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <span className="text-xs text-slate-400">〜</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          onBlur={(e) => handleSave({ endTime: e.target.value })}
          className="rounded-md border border-transparent px-1 text-xs text-slate-500 hover:border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function GenerateForm({ floor, onDone }: { floor: FloorData; onDone: () => void }) {
  const router = useRouter();
  const [performers, setPerformers] = useState<PerformerRow[]>(
    floor.slots.length > 0
      ? floor.slots.map((s) => ({
          key: s.id,
          name: s.performerName,
          sns: s.snsHandle ?? "",
          useFixed: s.isFixed,
          fixedDurationMinutes: s.isFixed ? String(slotDurationMinutes(s.startTime, s.endTime)) : "",
        }))
      : [newPerformerRow(), newPerformerRow()]
  );
  const [rounding, setRounding] = useState<"none" | "5min" | "10min">("none");
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
    if (floor.slots.length > 0 && !window.confirm("現在のタイムテーブルは上書きされます。よろしいですか？")) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizer/floors/${floor.id}/generate`, {
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました。");
        return;
      }
      router.refresh();
      onDone();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-sky-200 bg-sky-50 p-3">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div>
        <label className="block text-xs font-medium text-slate-600">区切り方</label>
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

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">
          出演者（出演順に入力。出演時間を固定したい場合は「時間固定」にチェックして分数を入力）
        </p>
        {performers.map((p, i) => (
          <div key={p.key} className="flex flex-wrap items-center gap-2 rounded-md bg-white p-2 shadow-sm">
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
        <button
          type="button"
          onClick={() => setPerformers((rows) => [...rows, newPerformerRow()])}
          className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700"
        >
          ＋ 出演者を追加
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
        >
          {submitting ? "作成中..." : "タイムテーブルを自動作成"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-white"
        >
          閉じる
        </button>
      </div>
    </form>
  );
}

function SlotRow({
  slot,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onChanged,
}: {
  slot: SlotData;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveField(patch: Partial<Pick<SlotData, "performerName" | "snsHandle" | "startTime" | "endTime">>) {
    setError(null);
    const res = await fetch(`/api/organizer/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performerName: patch.performerName ?? slot.performerName,
        snsHandle: patch.snsHandle ?? slot.snsHandle,
        startTime: patch.startTime ?? slot.startTime,
        endTime: patch.endTime ?? slot.endTime,
        isFixed: slot.isFixed,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "保存に失敗しました。");
      return;
    }
    onChanged();
  }

  async function handleDelete() {
    if (!window.confirm(`「${slot.performerName}」の枠を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/slots/${slot.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={
        "border-b border-slate-50 last:border-0" +
        (isDragging ? " opacity-40" : "") +
        (isDropTarget ? " border-t-2 border-t-sky-400" : "")
      }
    >
      <td className="px-1 py-1">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="ドラッグして並び替え"
          className="inline-block cursor-grab select-none px-1 text-slate-400 hover:text-slate-700 active:cursor-grabbing"
        >
          ⠿
        </span>
      </td>
      <td className="px-1 py-1">
        <input
          type="time"
          defaultValue={slot.startTime}
          onBlur={(e) => saveField({ startTime: e.target.value })}
          className="w-24 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </td>
      <td className="px-1 py-1">
        <input
          type="time"
          defaultValue={slot.endTime}
          onBlur={(e) => saveField({ endTime: e.target.value })}
          className="w-24 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </td>
      <td className="px-1 py-1 text-xs text-slate-500">{slotDurationMinutes(slot.startTime, slot.endTime)}分</td>
      <td className="px-1 py-1">
        <input
          type="text"
          defaultValue={slot.performerName}
          onBlur={(e) => saveField({ performerName: e.target.value })}
          className="w-full min-w-[8rem] rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </td>
      <td className="px-1 py-1">
        <input
          type="text"
          placeholder="@なし"
          defaultValue={slot.snsHandle ?? ""}
          onBlur={(e) => saveField({ snsHandle: e.target.value })}
          className="w-32 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </td>
      <td className="px-1 py-1 text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          削除
        </button>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </td>
    </tr>
  );
}

const COPY_FIELD_OPTIONS: { key: keyof Omit<SnsFormatOptions, "snsParentheses">; label: string }[] = [
  { key: "includeStartTime", label: "開始時間" },
  { key: "includeEndTime", label: "終了時間" },
  { key: "includeSns", label: "SNS" },
  { key: "includeDuration", label: "出演時間" },
];

export function FloorEditor({ floor, eventName, dayLabel }: { floor: FloorData; eventName: string; dayLabel: string }) {
  const router = useRouter();
  const [showGenerate, setShowGenerate] = useState(floor.slots.length === 0);
  const [copyLabel, setCopyLabel] = useState("SNSにコピー");
  const [deletingFloor, setDeletingFloor] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [copyOptions, setCopyOptions] = useState<SnsFormatOptions>(DEFAULT_SNS_FORMAT_OPTIONS);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  async function handleReorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = floor.slots.map((s) => s.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, fromId);
    const res = await fetch(`/api/organizer/floors/${floor.id}/slots/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    if (res.ok) router.refresh();
  }

  async function handleAddSlot() {
    setAddingSlot(true);
    try {
      const res = await fetch(`/api/organizer/floors/${floor.id}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerName: "新しい出演者",
          startTime: floor.startTime,
          endTime: floor.endTime,
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setAddingSlot(false);
    }
  }

  async function handleDeleteFloor() {
    if (!window.confirm(`フロア「${floor.name}」を削除しますか？タイムテーブルもすべて削除されます。`)) return;
    setDeletingFloor(true);
    try {
      const res = await fetch(`/api/organizer/floors/${floor.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeletingFloor(false);
    }
  }

  async function handleCopy() {
    const title = `【${eventName}】${dayLabel} ${floor.name} タイムテーブル`;
    const text = formatTimetableForSns(title, floor.slots, copyOptions);
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("コピーしました！");
    } catch {
      setCopyLabel("コピーに失敗しました");
    } finally {
      setTimeout(() => setCopyLabel("SNSにコピー"), 2000);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FloorHeaderFields floor={floor} onSaved={() => router.refresh()} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowGenerate((v) => !v)}
            className="rounded-md border border-sky-300 px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50"
          >
            {showGenerate ? "自動作成フォームを閉じる" : "タイムテーブルを自動作成"}
          </button>
          <button
            type="button"
            onClick={handleDeleteFloor}
            disabled={deletingFloor}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            フロアを削除
          </button>
        </div>
      </div>

      {showGenerate && (
        <div className="mt-3">
          <GenerateForm floor={floor} onDone={() => setShowGenerate(false)} />
        </div>
      )}

      <div className="mt-3">
        {floor.slots.length === 0 ? (
          <p className="text-sm text-slate-400">出演枠がまだありません。自動作成するか、手動で追加してください。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="px-1 py-1 font-medium"></th>
                  <th className="px-1 py-1 font-medium">開始</th>
                  <th className="px-1 py-1 font-medium">終了</th>
                  <th className="px-1 py-1 font-medium">出演時間</th>
                  <th className="px-1 py-1 font-medium">出演者名</th>
                  <th className="px-1 py-1 font-medium">SNS</th>
                  <th className="px-1 py-1 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {floor.slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    isDragging={dragSlotId === slot.id}
                    isDropTarget={dropTargetId === slot.id && dragSlotId !== slot.id}
                    onDragStart={() => setDragSlotId(slot.id)}
                    onDragEnter={() => setDropTargetId(slot.id)}
                    onDragEnd={() => {
                      setDragSlotId(null);
                      setDropTargetId(null);
                    }}
                    onDrop={() => {
                      if (dragSlotId) handleReorder(dragSlotId, slot.id);
                      setDragSlotId(null);
                      setDropTargetId(null);
                    }}
                    onChanged={() => router.refresh()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={handleAddSlot}
          disabled={addingSlot}
          className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700 disabled:opacity-60"
        >
          ＋ 出演枠を手動で追加
        </button>
      </div>

      {floor.slots.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">
          <span className="text-xs font-medium text-slate-500">コピーする項目:</span>
          {COPY_FIELD_OPTIONS.map((f) => (
            <label key={f.key} className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={copyOptions[f.key]}
                onChange={(e) => setCopyOptions((o) => ({ ...o, [f.key]: e.target.checked }))}
              />
              {f.label}
            </label>
          ))}
          {copyOptions.includeSns && (
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={copyOptions.snsParentheses}
                onChange={(e) => setCopyOptions((o) => ({ ...o, snsParentheses: e.target.checked }))}
              />
              SNSに(　)をつける
            </label>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            {copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
