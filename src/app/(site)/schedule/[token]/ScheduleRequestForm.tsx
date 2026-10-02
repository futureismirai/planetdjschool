"use client";

import { useState } from "react";
import { getJstDateParts } from "@/lib/date";
import styles from "../../site.module.css";

type Range = { start: string; end: string };
type CandidateInput = { date: string; startTime: string; endTime: string };

const TIME_START_HOUR = 10;
const TIME_END_HOUR = 23;
const STEP_MIN = 30;

function buildTimeOptions(): string[] {
  const opts: string[] = [];
  for (let h = TIME_START_HOUR; h <= TIME_END_HOUR; h++) {
    for (let m = 0; m < 60; m += STEP_MIN) {
      if (h === TIME_END_HOUR && m > 0) break;
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
}
const TIMES = buildTimeOptions();
const DEFAULT_RANGE: Range = { start: "14:00", end: "17:00" };

function buildInitialRanges(
  dateKeys: string[],
  existingCandidates: CandidateInput[]
): Record<string, Range[]> {
  const byDate: Record<string, Range[]> = {};
  for (const key of dateKeys) byDate[key] = [];
  for (const c of existingCandidates) {
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push({ start: c.startTime, end: c.endTime });
  }
  return byDate;
}

export function ScheduleRequestForm({
  token,
  dateKeys,
  existingCandidates,
  existingNote,
}: {
  token: string;
  dateKeys: string[];
  existingCandidates: CandidateInput[];
  existingNote: string;
}) {
  const [rangesByDate, setRangesByDate] = useState<Record<string, Range[]>>(() =>
    buildInitialRanges(dateKeys, existingCandidates)
  );
  const [note, setNote] = useState(existingNote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedCount = Object.values(rangesByDate).filter((r) => r.length > 0).length;

  function toggleDay(dateKey: string) {
    setRangesByDate((prev) => {
      const isOn = prev[dateKey].length > 0;
      return { ...prev, [dateKey]: isOn ? [] : [{ ...DEFAULT_RANGE }] };
    });
  }

  function addRange(dateKey: string) {
    setRangesByDate((prev) => ({
      ...prev,
      [dateKey]: [...prev[dateKey], { ...DEFAULT_RANGE }],
    }));
  }

  function removeRange(dateKey: string, index: number) {
    setRangesByDate((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].filter((_, i) => i !== index),
    }));
  }

  function updateRange(dateKey: string, index: number, field: "start" | "end", value: string) {
    setRangesByDate((prev) => ({
      ...prev,
      [dateKey]: prev[dateKey].map((r, i) => {
        if (i !== index) return r;
        if (field === "start") {
          return { start: value, end: value < r.end ? r.end : nextTimeAfter(value) };
        }
        return { ...r, end: value };
      }),
    }));
  }

  function nextTimeAfter(time: string): string {
    const idx = TIMES.indexOf(time);
    return TIMES[idx + 1] ?? TIMES[TIMES.length - 1];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidates: CandidateInput[] = [];
    for (const [date, ranges] of Object.entries(rangesByDate)) {
      for (const r of ranges) {
        candidates.push({ date, startTime: r.start, endTime: r.end });
      }
    }
    if (candidates.length === 0) {
      setError("候補日を1件以上選択してください。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule-requests/${token}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, note }),
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
          <p className={styles.bookSuccessTitle}>候補日を送信しました。</p>
          <p className={styles.bookSuccessBody}>
            ご回答ありがとうございます。いただいた候補の中から日程を確定し、担当講師より改めてご連絡いたします。
          </p>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className={styles.bookSection}>
        <div className={styles.daysHead}>
          <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>候補日を選択</p>
          <p className={styles.monoLabel}>
            選択中: <span className={styles.daysHeadCount}>{selectedCount}</span>件
          </p>
        </div>

        <div>
          {dateKeys.map((dateKey) => {
            const ranges = rangesByDate[dateKey];
            const isOn = ranges.length > 0;
            const { month, day, weekday } = getJstDateParts(new Date(`${dateKey}T00:00:00Z`));
            const isWeekend = weekday === "土" || weekday === "日";

            return (
              <div key={dateKey} className={`${styles.dayRow} ${isOn ? styles.dayRowIsOn : ""}`}>
                <label className={styles.dayToggleLine} onClick={(e) => { e.preventDefault(); toggleDay(dateKey); }}>
                  <span className={styles.checkbox}>
                    <svg viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8.5L6.2 12 13 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className={`${styles.dayDate} ${isWeekend ? styles.dayWeekend : ""}`}>
                    {month}/{day}
                    <span className={`${styles.dayWeekday} ${isWeekend ? styles.dayWeekend : ""}`}>
                      ({weekday})
                    </span>
                  </span>
                </label>

                {isOn && (
                  <div className={styles.dayRanges}>
                    {ranges.map((range, index) => (
                      <div key={index} className={styles.timeRange}>
                        <select
                          className={styles.timeSelect}
                          value={range.start}
                          onChange={(e) => updateRange(dateKey, index, "start", e.target.value)}
                        >
                          {TIMES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className={styles.timeTilde}>〜</span>
                        <select
                          className={styles.timeSelect}
                          value={range.end}
                          onChange={(e) => updateRange(dateKey, index, "end", e.target.value)}
                        >
                          {TIMES.filter((t) => t > range.start).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        {ranges.length > 1 && (
                          <button
                            type="button"
                            className={styles.rangeRemove}
                            onClick={() => removeRange(dateKey, index)}
                            aria-label="この時間帯を削除"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className={styles.rangeAdd} onClick={() => addRange(dateKey)}>
                      + 時間帯を追加
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.bookSection}>
        <div className={styles.form}>
          <div className={styles.formField}>
            <label htmlFor="note" className={`${styles.monoLabel} ${styles.formLabel}`}>
              備考(任意)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={styles.formInput}
              placeholder="例）19時以降なら平日も可能です"
            />
          </div>

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={styles.formSubmit}>
            {submitting ? "送信中..." : "この内容で候補日を送信する"}
          </button>
        </div>
      </section>
    </form>
  );
}
