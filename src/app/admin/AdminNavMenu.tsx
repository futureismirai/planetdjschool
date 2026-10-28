"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "カレンダー" },
  { href: "/admin/trial", label: "体験会" },
  { href: "/admin/lessons", label: "グループレッスン" },
  { href: "/admin/individual", label: "個別レッスン" },
  { href: "/admin/students", label: "レッスン進捗" },
  { href: "/admin/debut-events", label: "デビューイベント" },
  { href: "/admin/form-responses", label: "体験会アンケート" },
  { href: "/admin/post-course-survey", label: "受講後アンケート" },
];

/** 管理画面トップ階層の各ページ右上に表示する、全メニューをまとめたハンバーガーメニュー。 */
export function AdminNavMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="メニュー"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M2 4.5H16M2 9H16M2 13.5H16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={
                "block px-4 py-2 text-sm hover:bg-slate-50 " +
                (pathname === item.href ? "font-semibold text-sky-700" : "text-slate-700")
              }
            >
              {item.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
