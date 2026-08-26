"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPerformerRosterText } from "@/lib/performerRoster";

export type RosterEntryData = { id: string; name: string; snsHandle: string | null };
export type RosterData = { id: string; name: string; entries: RosterEntryData[] };

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
        placeholder="一覧表の名前"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xl font-bold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {error && <p className="mt-0.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function EntryRow({ entry, onChanged }: { entry: RosterEntryData; onChanged: () => void }) {
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
    if (!window.confirm(`「${entry.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/performer-roster-entries/${entry.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1.5">
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
  const [deletingRoster, setDeletingRoster] = useState(false);
  const [includeSns, setIncludeSns] = useState(true);
  const [copyLabel, setCopyLabel] = useState("コピーする");
  const [copyPreview, setCopyPreview] = useState<string | null>(null);

  async function handleAddEntry() {
    setAddingEntry(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${roster.id}/entries`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setAddingEntry(false);
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

  async function handleDeleteRoster() {
    if (!window.confirm(`「${roster.name}」を削除しますか？`)) return;
    setDeletingRoster(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${roster.id}`, { method: "DELETE" });
      if (res.ok) router.push("/organizer/performers");
    } finally {
      setDeletingRoster(false);
    }
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
          ← 一覧表に戻る
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
        <button
          type="button"
          onClick={handleDeleteRoster}
          disabled={deletingRoster}
          className="ml-auto rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          一覧表を削除
        </button>
      </div>

      <div className="space-y-1.5">
        {roster.entries.length === 0 && <p className="text-sm text-slate-500">まだ出演者がいません。</p>}
        {roster.entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} onChanged={() => router.refresh()} />
        ))}
        <button
          type="button"
          onClick={handleAddEntry}
          disabled={addingEntry}
          className="w-full rounded-md border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-700 disabled:opacity-60"
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
