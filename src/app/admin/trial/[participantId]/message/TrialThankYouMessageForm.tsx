"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrialThankYouMessageForm({
  participantId,
  studentName,
  defaultText,
}: {
  participantId: string;
  studentName: string;
  defaultText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(defaultText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!window.confirm(`「${studentName}」さんにこの内容でメールを送信しますか？`)) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trial-participants/${participantId}/thank-you-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。");
        return;
      }
      window.alert("送信しました。");
      router.push("/admin/trial");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {error && (
        <p className="mb-3 rounded-md bg-rose-50 p-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "送信中..." : "送信する"}
        </button>
      </div>
    </div>
  );
}
