import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../../LogoutButton";
import { fetchFormResponses } from "@/lib/googleSheet";
import { getKnownStudentNames } from "@/lib/knownStudentNames";

export const dynamic = "force-dynamic";

function guessDisplayName(fields: { label: string; value: string }[]): string | null {
  const match = fields.find((f) => f.label.includes("名前") || /name/i.test(f.label));
  const value = match?.value.trim();
  return value ? value : null;
}

export default async function AdminFormResponseDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email).trim().toLowerCase();

  const admin = await getCurrentAdmin();

  let responses: Awaited<ReturnType<typeof fetchFormResponses>> = [];
  let displayName: string = decodedEmail;
  let error: string | null = null;
  try {
    const [all, knownNames] = await Promise.all([fetchFormResponses(), getKnownStudentNames()]);
    responses = all
      .filter((r) => r.email === decodedEmail)
      .sort((a, b) => b.rowIndex - a.rowIndex);
    displayName =
      knownNames.get(decodedEmail) ??
      (responses.length > 0 ? guessDisplayName(responses[0].fields) : null) ??
      decodedEmail;
  } catch (e) {
    error = e instanceof Error ? e.message : "回答の取得に失敗しました。";
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
          <p className="mt-0.5 text-xs text-slate-400">{decodedEmail}</p>
          {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/admin/form-responses"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            一覧に戻る
          </Link>
          <LogoutButton />
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-md bg-rose-50 p-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {!error && responses.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          このメールアドレスに一致するアンケート結果が見つかりませんでした。
        </p>
      )}

      {!error && responses.length > 0 && (
        <ul className="mt-6 space-y-4">
          {responses.map((response) => (
            <li
              key={response.rowIndex}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <table className="w-full text-left text-sm">
                <tbody>
                  {response.fields.map((field, i) => (
                    <tr key={i} className="border-b border-slate-50 align-top last:border-0">
                      <td className="w-1/3 py-1.5 pr-3 text-xs text-slate-400">{field.label}</td>
                      <td className="py-1.5 whitespace-pre-wrap text-slate-800">
                        {field.value || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
