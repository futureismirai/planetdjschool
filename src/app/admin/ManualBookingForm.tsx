"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualBookingForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, studentName, studentEmail, studentPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      setStudentName("");
      setStudentEmail("");
      setStudentPhone("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ＋ 生徒を手動で追加
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-2 border-t border-slate-100 p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
    >
      <input
        type="text"
        required
        placeholder="生徒名(必須)"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <input
        type="email"
        placeholder="メールアドレス(任意)"
        value={studentEmail}
        onChange={(e) => setStudentEmail(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <input
        type="tel"
        placeholder="電話番号(任意)"
        value={studentPhone}
        onChange={(e) => setStudentPhone(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "追加中..." : "追加する"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        キャンセル
      </button>
      {error && (
        <p className="col-span-full rounded-md bg-rose-50 p-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
