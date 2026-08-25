"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/organizer/timetable", label: "タイムテーブル作成" },
  { href: "/organizer/venues", label: "会場情報" },
];

export function OrganizerTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "border-b-2 px-3 py-2 text-sm font-semibold transition " +
              (active
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
