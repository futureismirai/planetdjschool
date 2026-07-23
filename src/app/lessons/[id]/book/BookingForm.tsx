"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingForm({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, studentName, studentEmail, studentPhone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "予約に失敗しました。もう一度お試しください。");
        if (res.status === 409) {
          router.refresh();
        }
        return;
      }

      setDone(true);
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-md bg-emerald-50 p-4 text-center text-sm text-emerald-700">
        <p className="font-semibold">ご予約ありがとうございました。</p>
        <p className="mt-1">確認メールをお送りしましたのでご確認ください。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="studentName" className="block text-sm font-medium text-slate-700">
          お名前 <span className="text-rose-500">*</span>
        </label>
        <input
          id="studentName"
          type="text"
          required
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="山田 太郎"
        />
      </div>

      <div>
        <label htmlFor="studentEmail" className="block text-sm font-medium text-slate-700">
          メールアドレス <span className="text-rose-500">*</span>
        </label>
        <input
          id="studentEmail"
          type="email"
          required
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="example@gmail.com"
        />
      </div>

      <div>
        <label htmlFor="studentPhone" className="block text-sm font-medium text-slate-700">
          電話番号（任意）
        </label>
        <input
          id="studentPhone"
          type="tel"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          placeholder="090-1234-5678"
        />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "送信中..." : "この内容で予約する"}
      </button>
    </form>
  );
}
