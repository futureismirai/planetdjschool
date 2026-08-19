import type { ReactNode } from "react";
import Link from "next/link";
import { siteGrotesk, siteMono } from "../fonts";
import styles from "./site.module.css";

// 生徒向けページ(レッスン予約)専用のレイアウト。管理画面には適用されない。
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${siteGrotesk.variable} ${siteMono.variable} ${styles.root}`}>
      <header className={styles.masthead}>
        <div className={`${styles.wrap} ${styles.mastheadInner}`}>
          <Link href="/" className={styles.wordmark}>
            PLANET DJ SCHOOL
          </Link>
          <Link href="/admin" className={`${styles.mastheadNav} ${styles.monoLabel}`}>
            Admin &middot; Menu
          </Link>
        </div>
      </header>

      <main className={`${styles.wrap} ${styles.main}`}>{children}</main>

      <footer className={`${styles.wrap} ${styles.siteFooter}`}>
        <span className={styles.fine}>&copy; {new Date().getFullYear()} PLANET DJ SCHOOL</span>
        <span className={styles.tag}>See you on the floor.</span>
      </footer>
    </div>
  );
}
