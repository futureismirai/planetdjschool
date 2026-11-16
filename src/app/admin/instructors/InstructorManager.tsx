"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type InstructorItem = {
  id: string;
  name: string;
  email: string | null;
};

function NewInstructorForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      router.refresh();
      onDone();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input
        type="text"
        required
        placeholder="講師名(必須)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <input
        type="email"
        placeholder="メールアドレス(任意)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "登録中..." : "登録する"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        キャンセル
      </button>
      {error && (
        <p className="col-span-full rounded-md bg-rose-50 p-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function InstructorRow({ instructor }: { instructor: InstructorItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(instructor.email ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/instructors/${instructor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました。");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`「${instructor.name}」を講師一覧から削除しますか？(選択肢からも無くなります)`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/instructors/${instructor.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "削除に失敗しました。");
        return;
      }
      router.refresh();
    } catch {
      window.alert("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="px-2 py-2 font-medium text-slate-900 sm:px-4">{instructor.name}</td>
      <td className="px-2 py-2 sm:px-4">
        {editing ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレス(任意)"
              className="w-full min-w-[12em] rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail(instructor.email ?? "");
                  setError(null);
                  setEditing(false);
                }}
                disabled={saving}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
            </div>
            {error && <span className="text-[11px] text-rose-600">{error}</span>}
          </div>
        ) : (
          <span className="text-slate-600">{instructor.email ?? "-"}</span>
        )}
      </td>
      <td className="px-2 py-2 text-right sm:px-4">
        {!editing && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              編集
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export function InstructorManager({ instructors }: { instructors: InstructorItem[] }) {
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {showNewForm ? (
          <NewInstructorForm onDone={() => setShowNewForm(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            ＋ 新規講師を登録
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {instructors.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">講師がまだ登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="px-2 py-2 font-medium sm:px-4">講師名</th>
                  <th className="px-2 py-2 font-medium sm:px-4">メールアドレス</th>
                  <th className="px-2 py-2 font-medium sm:px-4"></th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => (
                  <InstructorRow key={instructor.id} instructor={instructor} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
