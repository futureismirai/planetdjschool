"use client";

import { useState } from "react";

type Props = {
  type: "group" | "individual";
  id: string;
  initialComment: string | null;
};

export function ProgressCommentField({ type, id, initialComment }: Props) {
  const [comment, setComment] = useState(initialComment ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint =
    type === "group"
      ? `/api/admin/bookings/${id}/comment`
      : `/api/admin/individual-participants/${id}/comment`;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "保存に失敗しました。");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-1.5">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="進捗コメントを記入..."
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {saved && <span className="text-xs text-emerald-600">保存しました</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
