"use client";

import { useState } from "react";

export function NextLessonEmailButton({
  bookingId,
  studentName,
  nextLessonName,
}: {
  bookingId: string;
  studentName: string;
  nextLessonName: string;
}) {
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (
      !window.confirm(
        `「${studentName}」さんに${nextLessonName}の受講を促すメールを送信しますか？`
      )
    )
      return;

    setSending(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/next-lesson-email`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(data.error ?? "送信に失敗しました。");
        return;
      }
      window.alert("送信しました。");
    } catch {
      window.alert("通信エラーが発生しました。");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={sending}
      className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {sending ? "送信中..." : `${nextLessonName}案内を送信`}
    </button>
  );
}
