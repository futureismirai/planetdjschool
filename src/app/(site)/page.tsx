import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatTimeOnly, getJstDateKey, getJstDateParts } from "@/lib/date";
import styles from "./site.module.css";

export const dynamic = "force-dynamic";

async function getUpcomingLessons() {
  const lessons = await prisma.lesson.findMany({
    where: { datetime: { gte: new Date() } },
    orderBy: { datetime: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime,
    instructorName: lesson.instructorName,
    remainingSlots: lesson.maxSlots - lesson._count.bookings,
  }));
}

type UpcomingLesson = Awaited<ReturnType<typeof getUpcomingLessons>>[number];

function groupLessonsByDate(lessons: UpcomingLesson[]) {
  const groups: { dateKey: string; lessons: UpcomingLesson[] }[] = [];

  for (const lesson of lessons) {
    const dateKey = getJstDateKey(lesson.datetime);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateKey === dateKey) {
      lastGroup.lessons.push(lesson);
    } else {
      groups.push({ dateKey, lessons: [lesson] });
    }
  }

  return groups;
}

/** 「Lesson 1」→「LESSON 01」のように整形する。それ以外(未定など)はそのまま表示する。 */
function formatLessonLabel(name: string): string {
  const match = name.match(/^Lesson (\d+)$/);
  if (!match) return name;
  return `LESSON ${match[1].padStart(2, "0")}`;
}

export default async function HomePage() {
  const lessons = await getUpcomingLessons();
  const dateGroups = groupLessonsByDate(lessons);

  return (
    <>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>
            LESSON
            <br />
            BOOKING
          </h1>
        </div>
        <div className={styles.heroMeta}>
          <p className={styles.jaTitle}>レッスン予約</p>
          <p className={styles.jaBody}>受講したいレッスンを選んで予約してください。</p>
        </div>
      </section>

      <nav className={styles.index}>
        <a
          href="https://www.notion.so/3735fe86c92a8063825ffc77f552bc95?source=copy_link"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.indexRow}
        >
          <span className={`${styles.indexChapter} ${styles.monoLabel}`}>01</span>
          <span className={styles.indexTitles}>
            <span className={styles.indexEn}>Lesson Guide</span>
            <span className={styles.indexJa}>レッスンに関する注意点</span>
          </span>
          <span className={styles.indexArrow}>&rarr;</span>
        </a>
        <a
          href="https://note.com/ginza_member"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.indexRow}
        >
          <span className={`${styles.indexChapter} ${styles.monoLabel}`}>02</span>
          <span className={styles.indexTitles}>
            <span className={styles.indexEn}>DJ Tips &amp; Note</span>
            <span className={styles.indexJa}>DJお役立ちnote</span>
          </span>
          <span className={styles.indexArrow}>&rarr;</span>
        </a>
      </nav>

      <section className={styles.schedule}>
        <div className={styles.scheduleHead}>
          <p className={styles.monoLabel}>Schedule</p>
        </div>

        {dateGroups.length === 0 ? (
          <p className={styles.emptyState}>現在予約可能なレッスンはありません。</p>
        ) : (
          dateGroups.map((group, groupIndex) => {
            const { month, day, weekday, year } = getJstDateParts(group.lessons[0].datetime);
            return (
              <div
                key={group.dateKey}
                className={`${styles.chapter} ${groupIndex === 0 ? styles.chapterIsNext : ""}`}
              >
                <div className={styles.chapterGrid}>
                  <div className={styles.chapterDateMain}>
                    <span className={styles.dateBig}>
                      {month}
                      <span className={styles.unit}>月</span>
                      {day}
                      <span className={styles.unit}>日</span>
                      <span className={styles.weekday}>({weekday})</span>
                    </span>
                    <span className={styles.dateYear}>{year}</span>
                  </div>
                  <div className={styles.lessonRows}>
                    {group.lessons.map((lesson) => {
                      const isFull = lesson.remainingSlots <= 0;
                      const rowClassName = `${styles.lessonRow} ${isFull ? styles.lessonRowIsFull : ""}`;
                      const spotsClassName = `${styles.lrSpots} ${
                        isFull
                          ? styles.lrSpotsIsFullTag
                          : lesson.remainingSlots === 1
                            ? styles.lrSpotsIsLow
                            : ""
                      }`;

                      const inner = (
                        <>
                          <span className={styles.lrTime}>{formatTimeOnly(lesson.datetime)}</span>
                          <span className={styles.lrLesson}>{formatLessonLabel(lesson.name)}</span>
                          <span className={styles.lrInstructor}>{lesson.instructorName}</span>
                          <span className={spotsClassName}>
                            {isFull ? (
                              "満席"
                            ) : (
                              <>
                                残り{" "}
                                <span className={styles.lrSpotsNum}>
                                  {String(lesson.remainingSlots).padStart(2, "0")}
                                </span>
                              </>
                            )}
                          </span>
                          <span className={styles.lrArrow}>&rarr;</span>
                        </>
                      );

                      return isFull ? (
                        <div key={lesson.id} aria-disabled="true" className={rowClassName}>
                          {inner}
                        </div>
                      ) : (
                        <Link
                          key={lesson.id}
                          href={`/lessons/${lesson.id}/book`}
                          className={rowClassName}
                        >
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
