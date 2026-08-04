import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../LogoutButton";
import { fetchFormResponses, type FormResponse, type FormResponseField } from "@/lib/googleSheet";
import { getKnownStudentNames } from "@/lib/knownStudentNames";

export const dynamic = "force-dynamic";

type GroupedResponse = {
  email: string;
  displayName: string;
  responses: FormResponse[];
};

function guessDisplayName(fields: FormResponseField[]): string | null {
  const match = fields.find((f) => f.label.includes("名前") || /name/i.test(f.label));
  const value = match?.value.trim();
  return value ? value : null;
}

function groupByEmail(
  responses: FormResponse[],
  knownNames: Map<string, string>
): {
  groups: GroupedResponse[];
  unmatchedCount: number;
} {
  const map = new Map<string, FormResponse[]>();
  let unmatchedCount = 0;

  for (const r of responses) {
    if (!r.email) {
      unmatchedCount += 1;
      continue;
    }
    const list = map.get(r.email) ?? [];
    list.push(r);
    map.set(r.email, list);
  }

  const groups = Array.from(map.entries()).map(([email, list]) => {
    const sorted = [...list].sort((a, b) => b.rowIndex - a.rowIndex);
    return {
      email,
      displayName: knownNames.get(email) ?? guessDisplayName(sorted[0].fields) ?? email,
      responses: sorted,
    };
  });
  groups.sort((a, b) => b.responses[0].rowIndex - a.responses[0].rowIndex);

  return { groups, unmatchedCount };
}

export default async function AdminFormResponsesPage() {
  const admin = await getCurrentAdmin();

  let groups: GroupedResponse[] = [];
  let unmatchedCount = 0;
  let error: string | null = null;
  try {
    const [responses, knownNames] = await Promise.all([
      fetchFormResponses(),
      getKnownStudentNames(),
    ]);
    const result = groupByEmail(responses, knownNames);
    groups = result.groups;
    unmatchedCount = result.unmatchedCount;
  } catch (e) {
    error = e instanceof Error ? e.message : "回答の取得に失敗しました。";
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">アンケート結果</h1>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
          <p className="mt-1 text-sm text-slate-500">
            Googleフォームの回答一覧です。体験会の参加者名からも該当する回答に遷移できます。
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
          <Link
            href="/admin/students"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            進捗状況
          </Link>
          <LogoutButton />
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-rose-50 p-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {!error && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {groups.length === 0 && (
            <p className="p-4 text-sm text-slate-500">回答がまだありません。</p>
          )}
          <ul className="divide-y divide-slate-100">
            {groups.map((group) => (
              <li key={group.email}>
                <Link
                  href={`/admin/form-responses/${encodeURIComponent(group.email)}`}
                  className="flex flex-col gap-0.5 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{group.displayName}</p>
                    <p className="text-xs text-slate-400">{group.email}</p>
                  </div>
                  <p className="text-xs text-slate-400">{group.responses.length}件の回答</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!error && unmatchedCount > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          メールアドレスが読み取れなかった回答が{unmatchedCount}件あります。
        </p>
      )}
    </div>
  );
}
