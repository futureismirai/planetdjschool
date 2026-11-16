import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminNavMenu } from "../AdminNavMenu";
import { InstructorManager } from "./InstructorManager";

export const dynamic = "force-dynamic";

async function getInstructors() {
  const instructors = await prisma.instructor.findMany({ orderBy: { createdAt: "asc" } });
  return instructors.map((i) => ({ id: i.id, name: i.name, email: i.email }));
}

export default async function AdminInstructorsPage() {
  const [admin, instructors] = await Promise.all([getCurrentAdmin(), getInstructors()]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">講師一覧</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            ここに登録した講師名が、レッスン・体験会・個別レッスン作成時の講師の選択肢になります。
          </p>
        </div>
        <AdminNavMenu />
      </div>

      <div className="mt-6">
        <InstructorManager instructors={instructors} />
      </div>
    </div>
  );
}
