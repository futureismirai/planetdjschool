"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SNS_FORMAT_OPTIONS,
  formatTimetableForSns,
  slotDurationMinutes,
  toHHMM,
  toMinutes,
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

const ROUNDING_OPTIONS: { value: "none" | "5min" | "10min"; label: string }[] = [
  { value: "5min", label: "5分区切り" },
  { value: "10min", label: "10分区切り" },
  { value: "none", label: "均等割り" },
];

function FloorHeaderFields({
  floor,
  showName,
  onSaved,
}: {
  floor: FloorData;
  showName: boolean;
  onSaved: () => void;
}) {
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
        {showName && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => handleSave({ name: e.target.value })}
            placeholder="フロア名"
            className="rounded-md border border-slate-300 px-1.5 py-1 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        )}
        <span className="text-xs font-medium text-slate-500">開催時間</span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          onBlur={(e) => handleSave({ startTime: e.target.value })}
          className="rounded-md border border-slate-300 px-1.5 py-1 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <span className="text-xs text-slate-400">〜</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          onBlur={(e) => handleSave({ endTime: e.target.value })}
          className="rounded-md border border-slate-300 px-1.5 py-1 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SlotRow({
  slot,
  rounding,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onChanged,
}: {
  slot: SlotData;
  rounding: "none" | "5min" | "10min";
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

  async function saveField(
    patch: Partial<Pick<SlotData, "performerName" | "snsHandle" | "startTime" | "endTime" | "isFixed">>
  ) {
    setError(null);
    const res = await fetch(`/api/organizer/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performerName: patch.performerName ?? slot.performerName,
        snsHandle: patch.snsHandle ?? slot.snsHandle,
        startTime: patch.startTime ?? slot.startTime,
        endTime: patch.endTime ?? slot.endTime,
        isFixed: patch.isFixed ?? slot.isFixed,
        rounding,
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
    <div
      data-slot-id={slot.id}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={
        "rounded-md border border-slate-200 p-1.5" +
        (isDragging ? " opacity-40" : "") +
        (isDropTarget ? " border-t-2 border-t-sky-400" : "")
      }
    >
      <div className="flex items-center gap-1">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onTouchStart={onDragStart}
          title="ドラッグして並び替え"
          style={{ touchAction: "none" }}
          className="shrink-0 cursor-grab select-none px-1 text-base text-slate-400 hover:text-slate-700 active:cursor-grabbing"
        >
          ⠿
        </span>
        <input
          type="time"
          defaultValue={slot.startTime}
          onBlur={(e) => saveField({ startTime: e.target.value, isFixed: true })}
          className="w-[4.5rem] shrink-0 rounded-md border border-slate-300 px-1 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <span className="shrink-0 text-xs text-slate-400">〜</span>
        <input
          type="time"
          defaultValue={slot.endTime}
          onBlur={(e) => saveField({ endTime: e.target.value, isFixed: true })}
          className="w-[4.5rem] shrink-0 rounded-md border border-slate-300 px-1 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="削除"
          className="ml-auto shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1 pl-6">
        <input
          type="number"
          min={1}
          defaultValue={slotDurationMinutes(slot.startTime, slot.endTime)}
          onBlur={(e) => {
            const minutes = Number(e.target.value);
            if (!Number.isFinite(minutes) || minutes <= 0) return;
            const endTime = toHHMM(toMinutes(slot.startTime) + minutes);
            saveField({ endTime, isFixed: true });
          }}
          className="w-14 shrink-0 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <span className="shrink-0 text-[11px] text-slate-500">分</span>
        <label className="ml-2 flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
          <input
            type="checkbox"
            checked={slot.isFixed}
            onChange={(e) => saveField({ isFixed: e.target.checked })}
          />
          時間固定
        </label>
      </div>
      <div className="mt-1 flex gap-1 pl-6">
        <input
          type="text"
          defaultValue={slot.performerName}
          onBlur={(e) => saveField({ performerName: e.target.value })}
          placeholder="出演者名"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <input
          type="text"
          placeholder="SNS（@なし）"
          defaultValue={slot.snsHandle ?? ""}
          onBlur={(e) => saveField({ snsHandle: e.target.value })}
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      {error && <p className="mt-1 pl-6 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const COPY_FIELD_OPTIONS: { key: keyof Omit<SnsFormatOptions, "snsParentheses">; label: string }[] = [
  { key: "includeStartTime", label: "開始時間" },
  { key: "includeEndTime", label: "終了時間" },
  { key: "includeSns", label: "SNS" },
];

export function FloorEditor({
  floor,
  eventName,
  dayLabel,
  showFloorName = false,
}: {
  floor: FloorData;
  eventName: string;
  dayLabel: string;
  showFloorName?: boolean;
}) {
  const router = useRouter();
  const [rounding, setRounding] = useState<"none" | "5min" | "10min">("5min");
  const [copyLabel, setCopyLabel] = useState("コピーする");
  const [deletingFloor, setDeletingFloor] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [copyOptions, setCopyOptions] = useState<SnsFormatOptions>(DEFAULT_SNS_FORMAT_OPTIONS);
  const [copyPreview, setCopyPreview] = useState<string | null>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // スマホなどのタッチ操作でも並び替えできるように、指の位置から対象行を検出する
  useEffect(() => {
    if (!dragSlotId) return;

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = (el as HTMLElement | null)?.closest<HTMLElement>("[data-slot-id]");
      if (row?.dataset.slotId) setDropTargetId(row.dataset.slotId);
    }

    function handleTouchEnd() {
      if (dragSlotId && dropTargetId && dropTargetId !== dragSlotId) {
        handleReorder(dragSlotId, dropTargetId);
      }
      setDragSlotId(null);
      setDropTargetId(null);
    }

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragSlotId, dropTargetId]);

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

  function buildCopyText(): string {
    const titleLines = [eventName, dayLabel];
    if (showFloorName) titleLines.push(floor.name);
    return formatTimetableForSns(titleLines, floor.slots, copyOptions);
  }

  function handleOpenCopyPreview() {
    setCopyLabel("コピーする");
    setCopyPreview(buildCopyText());
  }

  async function handleCopyToClipboard() {
    if (copyPreview === null) return;
    try {
      await navigator.clipboard.writeText(copyPreview);
      setCopyLabel("コピーしました！");
    } catch {
      setCopyLabel("コピーに失敗しました");
    }
  }

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FloorHeaderFields floor={floor} showName={showFloorName} onSaved={() => router.refresh()} />
        <button
          type="button"
          onClick={handleDeleteFloor}
          disabled={deletingFloor}
          className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          フロアを削除
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">区切り方</label>
        <select
          value={rounding}
          onChange={(e) => setRounding(e.target.value as typeof rounding)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {ROUNDING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        {floor.slots.length === 0 ? (
          <p className="text-sm text-slate-400">出演枠がまだありません。「＋ 出演枠を手動で追加」から追加してください。</p>
        ) : (
          <div className="space-y-1.5">
            {floor.slots.map((slot) => (
              <SlotRow
                key={`${slot.id}:${slot.startTime}:${slot.endTime}`}
                slot={slot}
                rounding={rounding}
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
            onClick={handleOpenCopyPreview}
            className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            SNSにコピー
          </button>
        </div>
      )}

      {copyPreview !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCopyPreview(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-bold text-slate-900">コピーされる内容</p>
            <textarea
              readOnly
              value={copyPreview}
              rows={Math.min(20, copyPreview.split("\n").length + 1)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-700"
              onFocus={(e) => e.target.select()}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCopyPreview(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                {copyLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
