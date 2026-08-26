import Link from "next/link";
import { QuickCreateForm } from "./QuickCreateForm";

export default function NewEventPage() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Link href="/organizer/timetable" className="text-xs text-slate-400 hover:text-slate-600">
          ← 戻る
        </Link>
        <h1 className="text-sm font-bold text-slate-900">新しいイベントを作成</h1>
        <span className="w-8" />
      </div>
      <QuickCreateForm />
    </div>
  );
}
