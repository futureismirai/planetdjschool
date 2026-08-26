import type { ReactNode } from "react";
import Link from "next/link";
import { OrganizerTabs } from "./OrganizerTabs";

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-2 sm:px-4">
          <Link href="/organizer" className="text-sm font-bold text-slate-900">
            イベントオーガナイザーツール
          </Link>
          <OrganizerTabs />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-6">{children}</div>
    </div>
  );
}
