"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPerformerRosterText } from "@/lib/performerRoster";

export type RosterEntryData = { id: string; name: string; snsHandle: string | null; isCategory: boolean };
export type RosterData = { id: string; name: string; entries: RosterEntryData[] };

const CATEGORY_PRESETS = ["【DJ】", "【LIVE】", "【VJ】", "【POP-UP】", "【FOOD】"];

function RosterNameField({ roster, onSaved }: { roster: RosterData; onSaved: () => void }) {
  const [name, setName] = useState(roster.name);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(value: string) {
    setError(null);
    const res = await fetch(`/api/organizer/performer-rosters/${roster.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
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
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => handleSave(e.target.value)}
        placeholder="一覧の名前"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xl font-bold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function MoveButtons({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label="上に移動"
        className="rounded-t-md border border-b-0 border-slate-200 px-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30"
      >
        ▲
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label="下に移動"
        className="rounded-b-md border border-slate-200 px-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-30"
      >
        ▼
      </button>
    </div>
  );
}

function EntryRow({
  entry,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onChanged,
}: {
  entry: RosterEntryData;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [snsHandle, setSnsHandle] = useState(entry.snsHandle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveField(patch: Partial<Pick<RosterEntryData, "name" | "snsHandle">>) {
    setError(null);
    const res = await fetch(`/api/organizer/performer-roster-entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patch.name ?? name,
        snsHandle: patch.snsHandle ?? snsHandle,
        isCategory: entry.isCategory,
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
    const label = entry.isCategory ? `「${entry.name}」の見出し` : `「${entry.name}」`;
    if (!window.confirm(`${label}を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/performer-roster-entries/${entry.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setDeleting(false);
    }
  }

  if (entry.isCategory) {
    return (
      <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 p-1.5">
        <MoveButtons isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => saveField({ name: e.target.value })}
          placeholder="見出し名"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-sm font-bold text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="削除"
          className="shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          ✕
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1.5">
      <MoveButtons isFirst={isFirst} isLast={isLast} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => saveField({ name: e.target.value })}
        placeholder="出演者名"
        className="min-w-0 flex-1 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <input
        type="text"
        value={snsHandle}
        onChange={(e) => setSnsHandle(e.target.value)}
        onBlur={(e) => saveField({ snsHandle: e.target.value })}
        placeholder="SNS（@なし）"
        className="min-w-0 flex-1 rounded-md border border-slate-300 px-1.5 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="削除"
        className="shrink-0 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
      >
        ✕
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function RosterEditor({ roster }: { roster: RosterData }) {
  const router = useRouter();
  const [addingEntry, setAddingEntry] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [includeSns, setIncludeSns] = useState(true);
  const [copyLabel, setCopyLabel] = useState("コピーする");
  const [copyPreview, setCopyPreview] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryInsertIndex, setCategoryInsertIndex] = useState<number | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  function openCategoryPicker(insertIndex: number) {
    setCategoryInsertIndex(insertIndex);
    setShowCategoryPicker(true);
  }

  async function handleAddEntry() {
    setAddingEntry(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${roster.id}/entries`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleAddCategory(label: string) {
    if (!label.trim()) return;
    setAddingCategory(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${roster.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCategory: true, name: label.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      // 挿入位置が指定されている場合は、作成直後にその位置へ並び替える
      const insertIndex = categoryInsertIndex ?? roster.entries.length;
      if (insertIndex < roster.entries.length) {
        const ids = roster.entries.map((e) => e.id);
        ids.splice(insertIndex, 0, data.entry.id);
        await fetch(`/api/organizer/performer-rosters/${roster.id}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: ids }),
        });
      }

      setShowCategoryPicker(false);
      setCategoryInsertIndex(null);
      setCustomCategory("");
      router.refresh();
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleSort() {
    setSorting(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${roster.id}/sort`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setSorting(false);
    }
  }

  async function handleMove(entryId: string, direction: -1 | 1) {
    const ids = roster.entries.map((e) => e.id);
    const index = ids.indexOf(entryId);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    const res = await fetch(`/api/organizer/performer-rosters/${roster.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
    if (res.ok) router.refresh();
  }

  function handleOpenCopyPreview() {
    setCopyLabel("コピーする");
    setCopyPreview(formatPerformerRosterText(roster.name, roster.entries, includeSns));
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
    <div className="space-y-4">
      <div>
        <Link href="/organizer/performers" className="text-xs text-slate-400 hover:text-slate-600">
          ← 一覧に戻る
        </Link>
        <RosterNameField roster={roster} onSaved={() => router.refresh()} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSort}
          disabled={sorting}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          A→Zで並び替え
        </button>
      </div>

      <div className="space-y-0.5">
        {roster.entries.length === 0 && <p className="text-sm text-slate-500">まだ出演者がいません。</p>}
        <button
          type="button"
          onClick={() => openCategoryPicker(0)}
          className="flex w-full items-center justify-center py-0.5 text-[10px] text-slate-300 hover:text-sky-500"
        >
          ＋ ここに見出しを挿入
        </button>
        {roster.entries.map((entry, index) => (
          <div key={entry.id}>
            <EntryRow
              entry={entry}
              isFirst={index === 0}
              isLast={index === roster.entries.length - 1}
              onMoveUp={() => handleMove(entry.id, -1)}
              onMoveDown={() => handleMove(entry.id, 1)}
              onChanged={() => router.refresh()}
            />
            <button
              type="button"
              onClick={() => openCategoryPicker(index + 1)}
              className="flex w-full items-center justify-center py-0.5 text-[10px] text-slate-300 hover:text-sky-500"
            >
              ＋ ここに見出しを挿入
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddEntry}
          disabled={addingEntry}
          className="mt-1 w-full rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700 disabled:opacity-60"
        >
          ＋ 出演者を追加
        </button>
      </div>

      {roster.entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={includeSns} onChange={(e) => setIncludeSns(e.target.checked)} />
            SNSを含める
          </label>
          <button
            type="button"
            onClick={handleOpenCopyPreview}
            className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            コピー
          </button>
        </div>
      )}

      {showCategoryPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setShowCategoryPicker(false);
            setCategoryInsertIndex(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-sm font-bold text-slate-900">見出しを追加</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddCategory(preset)}
                  disabled={addingCategory}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-sky-400 hover:bg-sky-50 disabled:opacity-60"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="自由に入力（例: 【出店】）"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => handleAddCategory(customCategory)}
                disabled={addingCategory || !customCategory.trim()}
                className="shrink-0 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                追加
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryPicker(false);
                  setCategoryInsertIndex(null);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                閉じる
              </button>
            </div>
          </div>
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
