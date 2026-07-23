import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LessonManager } from "./LessonManager";

export const dynamic = "force-dynamic";

async function getLessonsWithBookingCount() {
  const lessons = await prisma.lesson.findMany({
    orderBy: { datetime: "desc" },
    include: { _count: { select: { bookings: true } } },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime.toISOString(),
    instructorName: lesson.instructorName,
    maxSlots: lesson.maxSlots,
    location: lesson.location,
    bookingCount: lesson._count.bookings,
  }));
}

export default async function AdminLessonsPage() {
  const lessons = await getLessonsWithBookingCount();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">レッスン管理</h1>
          <p className="mt-1 text-sm text-slate-500">レッスンの追加・編集・削除ができます。</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">
          &larr; 予約管理に戻る
        </Link>
      </div>

      <div className="mt-6">
        <LessonManager lessons={lessons} />
      </div>
    </div>
  );
}
