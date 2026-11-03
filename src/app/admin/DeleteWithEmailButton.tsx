"use client";

import { useState } from "react";

/**
 * 参加者・予約の削除ボタン。押すと「メールを送り削除／メールを送らず削除／削除をキャンセル」の
 * 3択ポップアップを表示し、キャンセル通知メールを送るかどうかを選べるようにする。
 */
export function DeleteWithEmailButton({
  label = "削除",
  confirmMessage,
  deleting,
  onConfirm,
}: {
  label?: string;
  confirmMessage: string;
  deleting: boolean;
  onConfirm: (sendEmail: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={deleting}
        className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "削除中..." : label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-slate-700">{confirmMessage}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">キャンセルメールを送りますか？</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm(true);
                }}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                メールを送り削除
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm(false);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                メールを送らず削除
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                削除をキャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
