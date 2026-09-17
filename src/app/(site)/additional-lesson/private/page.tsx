import Link from "next/link";
import styles from "../../site.module.css";
import { AdditionalLessonPrivateForm } from "./AdditionalLessonPrivateForm";

export default function AdditionalLessonPrivatePage() {
  return (
    <>
      <Link href="/additional-lesson" className={`${styles.bookBack} ${styles.monoLabel}`}>
        <span className={styles.bookBackArrow}>&larr;</span>
        Back
      </Link>

      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>Additional Lesson / Private</p>
        <h1 className={styles.bookTitle}>プライベートレッスンの追加受講申し込み</h1>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>Your Details</p>
        <AdditionalLessonPrivateForm />
      </section>
    </>
  );
}
