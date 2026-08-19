import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
