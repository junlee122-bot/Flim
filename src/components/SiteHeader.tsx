"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 주 메뉴(사용자용). 관리자는 별도로 작게 노출.
const NAV = [
  { href: "/pick", label: "뭐 볼까" },
  { href: "/search", label: "검색" },
  { href: "/browse", label: "카탈로그" },
  { href: "/curations", label: "큐레이션" },
  { href: "/genre", label: "장르" },
  { href: "/tv", label: "TV" },
  { href: "/watch", label: "OTT" },
  { href: "/my", label: "마이" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-bone/10 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-baseline gap-2"
          aria-label="FLIM 홈"
        >
          <span className="headline text-2xl tracking-tight transition-colors group-hover:text-accent-soft">
            FLIM<span className="text-accent">.</span>
          </span>
          <span className="hidden text-xs text-faint sm:inline">
            씨네필의 영화 서재
          </span>
        </Link>

        {/* 데스크톱: 전체 메뉴 / 모바일: 하단 탭바로 대체(여기선 숨김) */}
        <nav className="hidden items-center gap-5 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] sm:flex sm:gap-7 [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => {
            const base = item.href.split("#")[0];
            const active = base !== "/" && pathname.startsWith(base);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`link-underline shrink-0 ${
                  active ? "text-bone" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/admin"
            className={`link-underline shrink-0 text-faint ${
              pathname.startsWith("/admin") ? "text-bone" : ""
            }`}
            aria-label="관리자"
          >
            관리
          </Link>
        </nav>

        {/* 모바일: 검색 바로가기만 (나머지는 하단 탭바) */}
        <Link
          href="/search"
          className="text-muted transition-colors hover:text-bone sm:hidden"
          aria-label="검색"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
