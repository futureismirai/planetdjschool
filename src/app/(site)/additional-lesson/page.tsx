import Link from "next/link";
import styles from "../site.module.css";

export default function AdditionalLessonPage() {
  return (
    <>
      <Link href="/" className={`${styles.bookBack} ${styles.monoLabel}`}>
        <span className={styles.bookBackArrow}>&larr;</span>
        Back to Schedule
      </Link>

      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>Additional Lesson</p>
        <h1 className={styles.bookTitle}>追加レッスンのご案内</h1>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>こんな人におすすめ</p>
        <p className={styles.planNote}>
          一通りレッスンを終えたが、デビューまで不安、学び足りないのでもう1回受講したい方
        </p>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>受講までの流れ</p>

        <div className={styles.planBlock}>
          <p className={styles.planTitle}>グループレッスンを希望の場合</p>
          <p className={styles.planPrice}>
            &yen;10,000<span className={styles.planPriceUnit}>（1.5h・グループ）</span>
          </p>
          <p className={styles.planDesc}>入金確認後、受講いただけます。</p>
          <Link href="/additional-lesson/group" className={styles.planButton}>
            申し込む
          </Link>
        </div>

        <div className={styles.planBlock}>
          <p className={styles.planTitle}>プライベートレッスンを希望の場合</p>
          <p className={styles.planPrice}>
            &yen;15,000<span className={styles.planPriceUnit}>（2h・マンツーマン確約）</span>
          </p>
          <p className={styles.planDesc}>入金確認後、講師と日程を調整のうえ受講いただけます。</p>
          <Link href="/additional-lesson/private" className={styles.planButton}>
            申し込む
          </Link>
        </div>
      </section>
    </>
  );
}
