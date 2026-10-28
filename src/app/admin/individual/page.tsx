import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNavMenu } from "../AdminNavMenu";
import { IndividualLessonManager } from "./IndividualLessonManager";
import { ScheduleRequestPanel } from "./ScheduleRequestPanel";

export const dynamic = "force-dynamic";

async function getIndividualLessonsWithParticipants() {
  const lessons = await prisma.individualLesson.findMany({
    orderBy: { datetime: "desc" },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
    },
  });

  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    datetime: lesson.datetime.toISOString(),
    instructorName: lesson.instructorName,
    location: lesson.location,
    participants: lesson.participants.map((p) => ({
      id: p.id,
      studentName: p.studentName,
      studentEmail: p.studentEmail,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

async function getScheduleRequests() {
  const requests = await prisma.scheduleRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { candidates: { orderBy: { startDatetime: "asc" } } },
  });

  return requests.map((r) => ({
    id: r.id,
    token: r.token,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    instructorName: r.instructorName,
    windowStart: r.windowStart.toISOString(),
    windowEnd: r.windowEnd.toISOString(),
    note: r.note,
    status: r.status,
    confirmedDatetime: r.confirmedDatetime ? r.confirmedDatetime.toISOString() : null,
    candidates: r.candidates.map((c) => ({
      id: c.id,
      startDatetime: c.startDatetime.toISOString(),
      endDatetime: c.endDatetime.toISOString(),
    })),
  }));
}

export default async function AdminIndividualPage() {
  const [admin, lessons, scheduleRequests] = await Promise.all([
    getCurrentAdmin(),
    getIndividualLessonsWithParticipants(),
    getScheduleRequests(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">個別レッスン</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            生徒には表示されません。管理者専用のページです。1回あたり1名までです。
          </p>
        </div>
        <AdminNavMenu />
      </div>

      <div className="mt-6">
        <ScheduleRequestPanel requests={scheduleRequests} />
      </div>

      <div className="mt-6">
        <IndividualLessonManager lessons={lessons} />
      </div>
    </div>
  );
}
