import type { ReactNode } from "react";
import Link from "next/link";

// 管理画面全体で共通の上部バー。生徒用の予約ページに戻れるようにするためのもの。
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-3 py-2 sm:px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            &larr; 生徒用の予約ページに戻る
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
