"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteRosterButton({ rosterId, rosterName }: { rosterId: string; rosterName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`「${rosterName}」を削除しますか？`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/organizer/performer-rosters/${rosterId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="一覧を削除"
      className="absolute right-2 top-2 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-60"
    >
      削除
    </button>
  );
}
