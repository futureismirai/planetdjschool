import Link from "next/link";
import { QuickCreateForm } from "./QuickCreateForm";

export default function NewEventPage() {
  return (
    <div className="space-y-4">
      <Link href="/organizer/timetable" className="text-xs text-slate-400 hover:text-slate-600">
        ← イベント一覧に戻る
      </Link>
      <div>
        <h1 className="text-xl font-bold text-slate-900">新しいイベントを作成</h1>
        <p className="mt-1 text-sm text-slate-500">
          イベント名・開催日・時間・出演者をまとめて入力すると、タイムテーブルまで自動で作成されます。
        </p>
      </div>
      <QuickCreateForm />
    </div>
  );
}
