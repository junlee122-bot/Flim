import type { Metadata } from "next";
import { Fraunces, Inter, Nanum_Myeongjo } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

// 디스플레이 세리프(라틴) — 잡지 헤드라인 톤
const display = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// 본문 산세리프(라틴)
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// 한글 세리프 — 헤드라인의 한글 글리프 담당
const serifKr = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif-kr",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flim-murex.vercel.app"),
  title: {
    default: "FLIM — 씨네필 영화 큐레이션 아카이브",
    template: "%s · FLIM",
  },
  description:
    "한 작품의 정보·평점·수상·평론을 한 화면에 정리하는 씨네필 큐레이션/비평 아카이브",
  openGraph: {
    title: "FLIM — 씨네필 영화 큐레이션 아카이브",
    description:
      "한 작품의 정보·평점·수상·평론을 한 화면에. 큐레이션과 비평의 아카이브.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${sans.variable} ${serifKr.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-ink-950 text-bone">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
