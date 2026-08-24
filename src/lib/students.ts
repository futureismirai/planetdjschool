import { prisma } from "@/lib/prisma";

// このページ自体の運営専用アカウント。生徒として扱わないため一覧から除外する。
const EXCLUDED_EMAIL = "futureismirai@gmail.com";

export type Attendance = {
  id: string;
  type: "group" | "individual";
  lessonName: string;
  datetime: Date;
  instructorName: string;
  comment: string | null;
  commentUpdatedAt: Date | null;
};

export type Student = {
  email: string;
  displayName: string;
  attendances: Attendance[];
  lastCommentUpdatedAt: Date | null;
  lastLessonDatetime: Date | null;
  hasMissingComment: boolean;
};

/**
 * グループレッスン・個別レッスンの登録者を、メールアドレスをキーに生徒単位でまとめる。
 * 表示名は各生徒の最も古い登録(createdAt最小)の生徒名を採用する。
 * 体験会の登録者はコメント欄の対象外のため含めない。
 */
export async function getStudents(): Promise<Student[]> {
  const [bookings, individualParticipants] = await Promise.all([
    prisma.booking.findMany({
      where: { studentEmail: { not: null } },
      include: { lesson: true },
    }),
    prisma.individualParticipant.findMany({
      include: { individualLesson: true },
    }),
  ]);

  type RawRecord = {
    email: string;
    studentName: string;
    createdAt: Date;
    attendance: Attendance;
  };

  const raw: RawRecord[] = [];

  for (const b of bookings) {
    if (!b.studentEmail) continue;
    raw.push({
      email: b.studentEmail,
      studentName: b.studentName,
      createdAt: b.createdAt,
      attendance: {
        id: b.id,
        type: "group",
        lessonName: b.lesson.name,
        datetime: b.lesson.datetime,
        instructorName: b.lesson.instructorName,
        comment: b.comment,
        commentUpdatedAt: b.commentUpdatedAt,
      },
    });
  }

  for (const p of individualParticipants) {
    raw.push({
      email: p.studentEmail,
      studentName: p.studentName,
      createdAt: p.createdAt,
      attendance: {
        id: p.id,
        type: "individual",
        lessonName: p.individualLesson.name,
        datetime: p.individualLesson.datetime,
        instructorName: p.individualLesson.instructorName,
        comment: p.comment,
        commentUpdatedAt: p.commentUpdatedAt,
      },
    });
  }

  raw.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const studentsByEmail = new Map<string, Student>();
  for (const r of raw) {
    const key = r.email.trim().toLowerCase();
    if (key === EXCLUDED_EMAIL) continue;

    let student = studentsByEmail.get(key);
    if (!student) {
      student = {
        email: key,
        displayName: r.studentName,
        attendances: [],
        lastCommentUpdatedAt: null,
        lastLessonDatetime: null,
        hasMissingComment: false,
      };
      studentsByEmail.set(key, student);
    }
    student.attendances.push(r.attendance);
  }

  const students = Array.from(studentsByEmail.values());
  for (const student of students) {
    student.attendances.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
    student.lastCommentUpdatedAt = student.attendances.reduce<Date | null>((latest, a) => {
      if (!a.commentUpdatedAt) return latest;
      if (!latest || a.commentUpdatedAt > latest) return a.commentUpdatedAt;
      return latest;
    }, null);
    student.lastLessonDatetime = student.attendances[0]?.datetime ?? null;
    student.hasMissingComment = student.attendances.some((a) => !a.comment || !a.comment.trim());
  }

  return students;
}
