import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLIM — 씨네필 영화 큐레이션 아카이브",
  description:
    "한 작품의 정보·평점·수상·평론을 한 화면에 정리하는 씨네필 큐레이션/비평 아카이브",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-ink-950 text-bone">
        <header className="border-b border-bone/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <Link href="/" className="headline text-2xl tracking-tight">
              FLIM<span className="text-accent">.</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted">
              <Link href="/search" className="hover:text-bone">
                검색
              </Link>
              <Link href="/#curations" className="hover:text-bone">
                큐레이션
              </Link>
              <Link href="/admin" className="hover:text-bone">
                관리자
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>

        <footer className="mt-20 border-t border-bone/10">
          <div className="mx-auto max-w-6xl px-5 py-10 text-xs text-muted">
            <p>
              FLIM — 씨네필을 위한 영화 큐레이션·비평 아카이브. 메타데이터:
              TMDb · 외부 평점: OMDb.
            </p>
            <p className="mt-1">
              평론은 저작권·이용약관 준수를 위해 짧은 인용/요약과 원문 링크만
              제공합니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
