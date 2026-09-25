import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLessonDateTime } from "@/lib/date";
import { BookingForm } from "./BookingForm";
import styles from "../../../site.module.css";

export const dynamic = "force-dynamic";

async function getLessonWithRemainingSlots(id: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!lesson) return null;
  return {
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime,
    instructorName: lesson.instructorName,
    remainingSlots: lesson.maxSlots - lesson._count.bookings,
  };
}

export default async function BookLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLessonWithRemainingSlots(id);

  if (!lesson) {
    notFound();
  }

  const isFull = lesson.remainingSlots <= 0;
  const isLesson1 = lesson.name === "Lesson 1";

  return (
    <>
      <Link href="/" className={`${styles.bookBack} ${styles.monoLabel}`}>
        <span className={styles.bookBackArrow}>&larr;</span>
        Back to Schedule
      </Link>

      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>
          {isLesson1 ? "Lesson 1" : "Booking"}
        </p>
        <h1 className={styles.bookTitle}>{lesson.name}</h1>

        <div className={styles.bookMeta}>
          <div className={styles.bookMetaRow}>
            <span className={`${styles.bookMetaLabel} ${styles.monoLabel}`}>日時</span>
            <span className={styles.bookMetaValue}>{formatLessonDateTime(lesson.datetime)}</span>
          </div>
          <div className={styles.bookMetaRow}>
            <span className={`${styles.bookMetaLabel} ${styles.monoLabel}`}>講師</span>
            <span className={styles.bookMetaValue}>{lesson.instructorName}</span>
          </div>
          {!isLesson1 && (
            <div className={styles.bookMetaRow}>
              <span className={`${styles.bookMetaLabel} ${styles.monoLabel}`}>残り枠</span>
              <span
                className={`${styles.bookMetaValue} ${
                  !isFull && lesson.remainingSlots === 1 ? styles.bookMetaValueLow : ""
                }`}
              >
                {isFull ? "満席" : `残り ${lesson.remainingSlots}枠`}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className={styles.bookSection}>
        {isLesson1 ? (
          <>
            <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>ご予約について</p>
            <p className={styles.planNote}>
              Lesson 1は、担当講師が直接ご案内・日程調整のうえご予約を確定しております。このサイトからのオンライン予約は行っておりませんので、受講をご希望の方は担当講師までご連絡ください。
            </p>
          </>
        ) : isFull ? (
          <p className={styles.bookFull}>このレッスンは満席のためご予約いただけません。</p>
        ) : (
          <>
            <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>Your Details</p>
            <BookingForm lessonId={lesson.id} />
          </>
        )}
      </section>
    </>
  );
}
