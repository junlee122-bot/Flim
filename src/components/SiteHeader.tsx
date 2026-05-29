"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/search", label: "검색" },
  { href: "/browse", label: "카탈로그" },
  { href: "/curations", label: "큐레이션" },
  { href: "/admin", label: "관리자" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-bone/10 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-baseline gap-2"
          aria-label="FLIM 홈"
        >
          <span className="headline text-2xl tracking-tight transition-colors group-hover:text-accent-soft">
            FLIM<span className="text-accent">.</span>
          </span>
          <span className="hidden text-[0.6rem] uppercase tracking-kicker text-faint sm:inline">
            Cinephile Archive
          </span>
        </Link>

        <nav className="flex items-center gap-7 text-sm">
          {NAV.map((item) => {
            const base = item.href.split("#")[0];
            const active = base !== "/" && pathname.startsWith(base);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`link-underline ${
                  active ? "text-bone" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
