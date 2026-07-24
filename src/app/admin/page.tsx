import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { LessonBookingManager } from "./LessonBookingManager";

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
      createdAt: b.createdAt.toISOString(),
    })),
  }));
}

export default async function AdminDashboardPage() {
  const [admin, lessons] = await Promise.all([getCurrentAdmin(), getAllLessonsWithBookings()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">予約・レッスン管理</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/trial"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            体験会管理
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
