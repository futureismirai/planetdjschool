"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 回答期限のデフォルト値(送信日から5日後)をYYYY-MM-DD形式で返す。
function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EventInviteForm({
  studentEmail,
  defaultText,
  eventOptions,
}: {
  studentEmail: string;
  defaultText: string;
  eventOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [text, setText] = useState(defaultText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!eventId) {
      setError("イベントを選択してください。");
      return;
    }
    if (!deadline) {
      setError("回答期限を設定してください。");
      return;
    }
    if (!window.confirm(`このメールアドレス(${studentEmail})にこの内容でメールを送信しますか？`)) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/students/${encodeURIComponent(studentEmail)}/event-invite-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, eventId, deadline }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。");
        return;
      }
      window.alert("送信しました。");
      router.push("/admin/students");
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

      <label className="block text-xs font-medium text-slate-500">
        イベント<span className="text-rose-500">*</span>
      </label>
      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        <option value="" disabled>
          選択してください
        </option>
        {eventOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="mt-4 block text-xs font-medium text-slate-500">
        回答期限<span className="text-rose-500">*</span>
      </label>
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 sm:w-auto"
      />

      <label className="mt-4 block text-xs font-medium text-slate-500">本文</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <p className="mt-2 text-xs text-slate-400">
        この下に、選択したイベントの詳細・回答期限と、参加可否・受講後アンケートに回答する専用ページへのリンクが自動で付与されて送信されます。
      </p>

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
