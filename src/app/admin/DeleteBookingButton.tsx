"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteBookingButton({
  bookingId,
  studentName,
}: {
  bookingId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${studentName}」さんの予約を本当に削除しますか？`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      window.alert("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}
