import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTimeRange } from "@/lib/date";
import styles from "../../site.module.css";
import { EventResponseForm } from "./EventResponseForm";

export const dynamic = "force-dynamic";

async function getInviteResponseByToken(token: string) {
  return prisma.eventInviteResponse.findUnique({
    where: { token },
    include: { event: true },
  });
}

export default async function EventResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inviteResponse = await getInviteResponseByToken(token);

  if (!inviteResponse) {
    notFound();
  }

  const eventDateTimeText = formatDateTimeRange(
    inviteResponse.event.startDatetime,
    inviteResponse.event.endDatetime
  );

  return (
    <>
      <section className={styles.bookHero}>
        <p className={`${styles.monoLabel} ${styles.bookEyebrow}`}>Debut Event / Response</p>
        <h1 className={styles.bookTitle}>イベント出演について</h1>
        <p className={styles.bookIntro}>
          {inviteResponse.studentName} 様
          <br />
          <br />
          いつもPlanet DJ Schoolをご利用いただきありがとうございます。
          <br />
          下記の内容にご回答ください。アンケートまでご回答いただくと送信が完了します。
        </p>
      </section>

      <section className={styles.bookSection}>
        <p className={`${styles.monoLabel} ${styles.bookSectionHead}`}>開催概要</p>
        <div className={styles.bookMeta}>
          <div className={styles.bookMetaRow}>
            <span className={`${styles.monoLabel} ${styles.bookMetaLabel}`}>日時</span>
            <span className={styles.bookMetaValue}>{eventDateTimeText}</span>
          </div>
          {inviteResponse.event.venue && (
            <div className={styles.bookMetaRow}>
              <span className={`${styles.monoLabel} ${styles.bookMetaLabel}`}>会場</span>
              <span className={styles.bookMetaValue}>{inviteResponse.event.venue}</span>
            </div>
          )}
        </div>
      </section>

      {inviteResponse.status === "answered" ? (
        <section className={styles.bookSection}>
          <div className={styles.bookSuccess}>
            <p className={styles.bookSuccessTitle}>回答ありがとうございました。</p>
            <p className={styles.bookSuccessBody}>
              この回答は既に送信済みです。
              <br />
              出演が確定した場合は、担当講師より改めてご連絡いたします。
            </p>
          </div>
        </section>
      ) : (
        <EventResponseForm token={token} />
      )}
    </>
  );
}
