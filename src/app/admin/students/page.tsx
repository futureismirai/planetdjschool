import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { formatLessonDateTime } from "@/lib/date";
import { ProgressCommentField } from "./ProgressCommentField";

export const dynamic = "force-dynamic";

// このページ自体の運営専用アカウント。生徒として扱わないため一覧から除外する。
const EXCLUDED_EMAIL = "futureismirai@gmail.com";

type Attendance = {
  id: string;
  type: "group" | "individual";
  lessonName: string;
  datetime: Date;
  comment: string | null;
};

type Student = {
  email: string;
  displayName: string;
  attendances: Attendance[];
};

/**
 * グループレッスン・個別レッスンの登録者を、メールアドレスをキーに生徒単位でまとめる。
 * 表示名は各生徒の最も古い登録(createdAt最小)の生徒名を採用する。
 * 体験会の登録者はコメント欄の対象外のため含めない。
 */
async function getStudents(): Promise<Student[]> {
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
        comment: b.comment,
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
        comment: p.comment,
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
      student = { email: key, displayName: r.studentName, attendances: [] };
      studentsByEmail.set(key, student);
    }
    student.attendances.push(r.attendance);
  }

  const students = Array.from(studentsByEmail.values());
  for (const student of students) {
    student.attendances.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  }
  students.sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));

  return students;
}

export default async function AdminStudentsPage() {
  const [admin, students] = await Promise.all([getCurrentAdmin(), getStudents()]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">生徒別進捗</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            グループレッスン・個別レッスンの生徒ごとに進捗コメントを記入できます(体験会は対象外)。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            カレンダー
          </Link>
          <Link
            href="/admin/lessons"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            グループレッスン
          </Link>
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会
          </Link>
          <Link
            href="/admin/individual"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            個別レッスン
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {students.length === 0 && (
          <p className="text-sm text-slate-500">対象の生徒がまだいません。</p>
        )}
        {students.map((student) => (
          <section
            key={student.email}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-base font-semibold text-slate-900">{student.displayName}</h2>
              <span className="text-xs text-slate-400">{student.email}</span>
            </div>
            <ul className="mt-3 space-y-3">
              {student.attendances.map((a) => (
                <li
                  key={`${a.type}-${a.id}`}
                  className="rounded-md border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (a.type === "group"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-emerald-100 text-emerald-700")
                      }
                    >
                      {a.type === "group" ? "グループ" : "個別"}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{a.lessonName}</span>
                    <span className="text-xs text-slate-500">
                      {formatLessonDateTime(a.datetime)}
                    </span>
                  </div>
                  <ProgressCommentField type={a.type} id={a.id} initialComment={a.comment} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
