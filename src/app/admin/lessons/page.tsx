import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { LessonBookingManager } from "../LessonBookingManager";

export const dynamic = "force-dynamic";

async function getAllLessonsWithBookings() {
  const lessons = await prisma.lesson.findMany({
    orderBy: { datetime: "desc" },
    include: {
      bookings: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime.toISOString(),
    instructorName: lesson.instructorName,
    maxSlots: lesson.maxSlots,
    location: lesson.location,
    bookings: lesson.bookings.map((b) => ({
      id: b.id,
      studentName: b.studentName,
      studentEmail: b.studentEmail,
      studentPhone: b.studentPhone,
      note: b.note,
      nextLessonEmailSentAt: b.nextLessonEmailSentAt ? b.nextLessonEmailSentAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminLessonsPage() {
  const [admin, lessons] = await Promise.all([getCurrentAdmin(), getAllLessonsWithBookings()]);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">グループレッスン</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            カレンダー
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
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            進捗状況
          </Link>
          <Link
            href="/admin/form-responses"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            アンケート結果
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-6">
        <LessonBookingManager lessons={lessons} />
      </div>
    </div>
  );
}
