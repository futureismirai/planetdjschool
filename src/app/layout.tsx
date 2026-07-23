import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planet DJ School | レッスン予約",
  description: "Planet DJ School のレッスン予約システムです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
              Planet DJ School
            </Link>
            <nav className="text-sm text-slate-500">
              <Link href="/admin" className="hover:text-slate-900">
                管理者ページ
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Planet DJ School
        </footer>
      </body>
    </html>
  );
}
