import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateOnly, formatTimeOnly, getJstDateKey, getJstDayWindow } from "@/lib/date";
import styles from "../../site.module.css";
import { ScheduleRequestForm } from "./ScheduleRequestForm";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 14;

async function getScheduleRequestByToken(token: string) {
  const scheduleRequest = await prisma.scheduleRequest.findUnique({
    where: { token },
    include: { candidates: { orderBy: { startDatetime: "asc" } } },
  });
  return scheduleRequest;
}

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const scheduleRequest = await getScheduleRequestByToken(token);

  if (!scheduleRequest) {
    notFound();
  }

  const dateKeys = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) =>
    getJstDateKey(getJstDayWindow(i, scheduleRequest.windowStart).start)
  );

  const existingCandidates = scheduleRequest.candidates.map((c) => ({
    date: getJstDateKey(c.startDatetime),
    startTime: formatTimeOnly(c.startDatetime),
    endTime: formatTimeOnly(c.endDatetime),
  }));

  return (
    <>
      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>Individual Lesson / Schedule</p>
        <h1 className={styles.bookTitle}>日程調整のお願い</h1>
        <p className={styles.bookIntro}>
          {scheduleRequest.studentName} 様
          <br />
          <br />
          個別レッスンの受講、ありがとうございます。
          {scheduleRequest.instructorName ? `担当講師の${scheduleRequest.instructorName}です。` : ""}
          <br />
          下記の期間の中から、ご都合の良い候補日・時間帯をできるだけ多くお選びください。
        </p>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>回答期間</p>
        <div className={styles.periodRange}>
          <span className={styles.periodDate}>{formatDateOnly(scheduleRequest.windowStart)}</span>
          <span className={styles.periodArrow}>&rarr;</span>
          <span className={styles.periodDate}>
            {formatDateOnly(new Date(scheduleRequest.windowEnd.getTime() - 24 * 60 * 60 * 1000))}
          </span>
        </div>
      </section>

      {scheduleRequest.status === "confirmed" ? (
        <section className={styles.bookSection}>
          <div className={styles.bookSuccess}>
            <p className={styles.bookSuccessTitle}>日程は確定済みです。</p>
            <p className={styles.bookSuccessBody}>
              {scheduleRequest.confirmedDatetime &&
                `確定日時: ${formatDateOnly(scheduleRequest.confirmedDatetime)} ${formatTimeOnly(scheduleRequest.confirmedDatetime)}〜`}
              <br />
              改めて担当講師よりご連絡いたします。
            </p>
          </div>
        </section>
      ) : (
        <ScheduleRequestForm
          token={token}
          dateKeys={dateKeys}
          existingCandidates={existingCandidates}
          existingNote={scheduleRequest.note ?? ""}
        />
      )}
    </>
  );
}
