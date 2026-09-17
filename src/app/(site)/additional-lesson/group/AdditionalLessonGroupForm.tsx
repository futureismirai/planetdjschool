"use client";

import { useState } from "react";
import { formatLessonDateTime } from "@/lib/date";
import styles from "../../site.module.css";

type LessonOption = {
  id: string;
  name: string;
  datetime: string; // ISO文字列
  instructorName: string;
};

export function AdditionalLessonGroupForm({ lessons }: { lessons: LessonOption[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lessonId, setLessonId] = useState("");
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
        body: JSON.stringify({ type: "group", name, email, lessonId }),
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
          入金方法など、担当より追ってご連絡いたします。このお申し込み自体では予約は確定していません。
        </p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return <p className={styles.planNote}>現在申し込み可能なグループレッスンの日程がありません。</p>;
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
        <label htmlFor="lessonId" className={`${styles.monoLabel} ${styles.formLabel}`}>
          受講希望日<span className={styles.formRequired}>*</span>
        </label>
        <select
          id="lessonId"
          required
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className={styles.formInput}
        >
          <option value="" disabled>
            選択してください
          </option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {formatLessonDateTime(new Date(lesson.datetime))} {lesson.name}（{lesson.instructorName}）
            </option>
          ))}
        </select>
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
