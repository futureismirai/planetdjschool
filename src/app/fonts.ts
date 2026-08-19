import { Archivo, IBM_Plex_Mono } from "next/font/google";

// レッスン予約ページ(生徒向け)専用のフォント。管理画面には影響しない。
// 日本語(Zen Kaku Gothic New)はこのNext.jsバージョンのnext/font/googleが
// japaneseサブセットを提供していないため、システムフォントにフォールバックする。
export const siteGrotesk = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-grotesk",
});

export const siteMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-site",
});
