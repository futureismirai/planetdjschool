"use client";

import { useState } from "react";
import styles from "../../site.module.css";
import {
  EVENT_PARTICIPATION_OPTIONS,
  INSTAGRAM_SHARE_LABEL,
  SURVEY_QUESTIONS,
  type SurveyAnswers,
} from "@/lib/constants";

const EMPTY_ANSWERS: SurveyAnswers = {
  djName: "",
  joinStatus: "",
  lessonSufficiency: "",
  moreToLearn: "",
  wantsMoreLessons: "",
  improvements: "",
  message: "",
  contactPreference: "",
  instagramHandle: "",
};

export function EventResponseForm({ token }: { token: string }) {
  const [participationAnswer, setParticipationAnswer] = useState("");
  const [answers, setAnswers] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setAnswer(key: keyof SurveyAnswers, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!participationAnswer) {
      setError("参加可否を選択してください。");
      return;
    }
    for (const q of SURVEY_QUESTIONS) {
      if (q.required && !answers[q.key].trim()) {
        setError(`「${q.question}」にご回答ください。`);
        return;
      }
    }
    if (answers.contactPreference === INSTAGRAM_SHARE_LABEL && !answers.instagramHandle.trim()) {
      setError("Instagramのアカウントをご入力ください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/event-responses/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participationAnswer, answers }),
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
      <section className={styles.bookSection}>
        <div className={styles.bookSuccess}>
          <p className={styles.bookSuccessTitle}>回答ありがとうございました。</p>
          <p className={styles.bookSuccessBody}>
            出演が確定した場合は、担当講師より改めてご連絡いたします。
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>
          参加可否<span className={styles.formRequired}>*</span>
        </p>
        <div className={styles.segmented}>
          {EVENT_PARTICIPATION_OPTIONS.map((o) => (
            <div key={o.value} className={styles.segmentedOption}>
              <input
                type="radio"
                name="participation"
                id={`participation-${o.value}`}
                checked={participationAnswer === o.value}
                onChange={() => setParticipationAnswer(o.value)}
              />
              <label htmlFor={`participation-${o.value}`}>{o.label}</label>
            </div>
          ))}
        </div>
        <p className={styles.segmentedNote}>
          「参加できない」を選択された方には、後日改めて次にご出演いただけそうなイベントをご案内いたします。
        </p>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>受講後アンケート</p>
        <p className={styles.planNote} style={{ marginBottom: 24 }}>
          Planet DJ Schoolで3回のレッスンを受講した方へのアンケートです。今後の運営のためにぜひご協力をお願いします。
        </p>

        <div className={styles.qList}>
          {SURVEY_QUESTIONS.map((q, i) => {
            // Instagramのアカウント入力欄は、直前の設問で「教える」を選んだ場合のみ表示する。
            if (q.key === "instagramHandle" && answers.contactPreference !== INSTAGRAM_SHARE_LABEL) {
              return null;
            }

            return (
              <div key={q.key}>
                <div className={styles.qHead}>
                  <span className={styles.qNum}>Q{i + 1}</span>
                  <span className={styles.qText}>
                    {q.question}
                    {q.required && <span className={styles.qRequired}>*</span>}
                  </span>
                </div>
                {"note" in q && q.note && <p className={styles.qOptionsNote}>（{q.note}）</p>}

                {q.type === "text" && (
                  <input
                    type="text"
                    className={styles.formInput}
                    value={answers[q.key]}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                    placeholder={q.key === "instagramHandle" ? "例）@planetdjschool" : "例）DJ TARO"}
                  />
                )}

                {q.type === "choice" && (
                  <div className={styles.segmented}>
                    {q.options.map((opt) => (
                      <div key={opt} className={styles.segmentedOption}>
                        <input
                          type="radio"
                          name={q.key}
                          id={`${q.key}-${opt}`}
                          checked={answers[q.key] === opt}
                          onChange={() => setAnswer(q.key, opt)}
                        />
                        <label htmlFor={`${q.key}-${opt}`}>{opt}</label>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "textarea" && (
                  <textarea
                    className={styles.formTextarea}
                    value={answers[q.key]}
                    onChange={(e) => setAnswer(q.key, e.target.value)}
                    placeholder="（任意）"
                    rows={3}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.bookSection}>
        <div className={styles.form}>
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={styles.formSubmit}>
            {submitting ? "送信中..." : "回答を送信する"}
          </button>
        </div>
      </section>
    </form>
  );
}
