import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { LogoutButton } from "../admin/LogoutButton";
import { OrganizerTabs } from "./OrganizerTabs";

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/organizer" className="text-lg font-bold text-slate-900">
                イベントオーガナイザーツール
              </Link>
              {admin && <p className="mt-0.5 text-xs text-slate-400">ログイン中: {admin.email}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                管理画面トップへ
              </Link>
              <LogoutButton />
            </div>
          </div>
          <OrganizerTabs />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 sm:py-8">{children}</div>
    </div>
  );
}
