"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../../site.module.css";

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
      <div className={styles.bookSuccess}>
        <p className={styles.bookSuccessTitle}>ご予約ありがとうございました。</p>
        <p className={styles.bookSuccessBody}>確認メールをお送りしましたのでご確認ください。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formField}>
        <label htmlFor="studentName" className={`${styles.monoLabel} ${styles.formLabel}`}>
          お名前<span className={styles.formRequired}>*</span>
        </label>
        <input
          id="studentName"
          type="text"
          required
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          className={styles.formInput}
          placeholder="山田 太郎"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="studentEmail" className={`${styles.monoLabel} ${styles.formLabel}`}>
          メールアドレス<span className={styles.formRequired}>*</span>
        </label>
        <input
          id="studentEmail"
          type="email"
          required
          value={studentEmail}
          onChange={(e) => setStudentEmail(e.target.value)}
          className={styles.formInput}
          placeholder="example@gmail.com"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="studentPhone" className={`${styles.monoLabel} ${styles.formLabel}`}>
          電話番号（任意）
        </label>
        <input
          id="studentPhone"
          type="tel"
          value={studentPhone}
          onChange={(e) => setStudentPhone(e.target.value)}
          className={styles.formInput}
          placeholder="090-1234-5678"
        />
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className={styles.formSubmit}>
        {submitting ? "送信中..." : "この内容で予約する"}
      </button>
    </form>
  );
}
