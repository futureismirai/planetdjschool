import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../../site.module.css";
import { AdditionalLessonGroupForm } from "./AdditionalLessonGroupForm";

export const dynamic = "force-dynamic";

async function getUpcomingGroupLessons() {
  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: new Date() } },
    orderBy: { datetime: "asc" },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime.toISOString(),
    instructorName: lesson.instructorName,
  }));
}

export default async function AdditionalLessonGroupPage() {
  const lessons = await getUpcomingGroupLessons();

  return (
    <>
      <Link href="/additional-lesson" className={`${styles.bookBack} ${styles.monoLabel}`}>
        <span className={styles.bookBackArrow}>&larr;</span>
        Back
      </Link>

      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>Additional Lesson / Group</p>
        <h1 className={styles.bookTitle}>グループレッスンの追加受講申し込み</h1>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>Your Details</p>
        <AdditionalLessonGroupForm lessons={lessons} />
      </section>
    </>
  );
}
