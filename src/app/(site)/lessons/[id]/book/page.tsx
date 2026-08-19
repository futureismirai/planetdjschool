import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLessonDateTime } from "@/lib/date";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

async function getLessonWithRemainingSlots(id: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!lesson) return null;
  return {
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime,
    instructorName: lesson.instructorName,
    remainingSlots: lesson.maxSlots - lesson._count.bookings,
  };
}

export default async function BookLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLessonWithRemainingSlots(id);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; レッスン一覧に戻る
      </Link>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">{lesson.name}</h1>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-14 text-slate-400">日時</dt>
            <dd>{formatLessonDateTime(lesson.datetime)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 text-slate-400">講師</dt>
            <dd>{lesson.instructorName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 text-slate-400">残り枠</dt>
            <dd>{lesson.remainingSlots > 0 ? `${lesson.remainingSlots}枠` : "満席"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        {lesson.remainingSlots > 0 ? (
          <BookingForm lessonId={lesson.id} />
        ) : (
          <p className="rounded-md bg-slate-100 p-4 text-center text-sm text-slate-500">
            このレッスンは満席のためご予約いただけません。
          </p>
        )}
      </div>
    </div>
  );
}
