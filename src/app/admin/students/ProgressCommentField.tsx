"use client";

import { useState } from "react";

type Props = {
  type: "group" | "individual";
  id: string;
  initialComment: string | null;
};

export function ProgressCommentField({ type, id, initialComment }: Props) {
  const [comment, setComment] = useState(initialComment ?? "");
  const [draft, setDraft] = useState(initialComment ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    type === "group"
      ? `/api/admin/bookings/${id}/comment`
      : `/api/admin/individual-participants/${id}/comment`;

  function startEditing() {
    setDraft(comment);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(comment);
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "保存に失敗しました。");
      }
      setComment(draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-2">
        {comment ? (
          <p className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
            {comment}
          </p>
        ) : (
          <p className="rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
            進捗コメントは未入力です
          </p>
        )}
        <button
          type="button"
          onClick={startEditing}
          className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          {comment ? "編集" : "コメントを入力"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        placeholder="進捗コメントを記入..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-base leading-relaxed text-slate-700 focus:border-slate-500 focus:outline-none sm:text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={saving}
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          キャンセル
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
