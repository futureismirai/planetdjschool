"use client";

import { useState } from "react";
import styles from "../../site.module.css";

export function AdditionalLessonPrivateForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [desiredSchedule, setDesiredSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/additional-lesson-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "private", name, email, desiredSchedule }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました。もう一度お試しください。");
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
        <p className={styles.bookSuccessTitle}>お申し込みを受け付けました。</p>
        <p className={styles.bookSuccessBody}>
          入金方法や日程調整について、担当より追ってご連絡いたします。このお申し込み自体では予約は確定していません。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formField}>
        <label htmlFor="name" className={`${styles.monoLabel} ${styles.formLabel}`}>
          お名前<span className={styles.formRequired}>*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.formInput}
          placeholder="山田 太郎"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="email" className={`${styles.monoLabel} ${styles.formLabel}`}>
          メールアドレス<span className={styles.formRequired}>*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.formInput}
          placeholder="example@gmail.com"
        />
      </div>

      <div className={styles.formField}>
        <label htmlFor="desiredSchedule" className={`${styles.monoLabel} ${styles.formLabel}`}>
          可能な日付・時間<span className={styles.formRequired}>*</span>
        </label>
        <textarea
          id="desiredSchedule"
          required
          rows={4}
          value={desiredSchedule}
          onChange={(e) => setDesiredSchedule(e.target.value)}
          className={styles.formInput}
          placeholder="例）9/20(日)以降の平日夜、または10/4(日)午後など"
        />
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className={styles.formSubmit}>
        {submitting ? "送信中..." : "この内容で申し込む"}
      </button>
    </form>
  );
}
