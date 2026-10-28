import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNavMenu } from "../AdminNavMenu";
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
      <div className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">グループレッスン</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <AdminNavMenu />
      </div>

      <div className="mt-6">
        <LessonBookingManager lessons={lessons} />
      </div>
    </div>
  );
}
