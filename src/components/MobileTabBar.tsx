"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 모바일 하단 탭바 — 핵심 5개. 데스크톱(sm+)에서는 숨김.
const TABS = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/pick", label: "뭐 볼까", icon: "sparkles" },
  { href: "/search", label: "검색", icon: "search" },
  { href: "/watch", label: "OTT", icon: "tv" },
  { href: "/my", label: "마이", icon: "user" },
] as const;

function Icon({ name }: { name: string }) {
  const c = "h-[22px] w-[22px]";
  const props = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return <svg className={c} viewBox="0 0 24 24" {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
    case "sparkles":
      return <svg className={c} viewBox="0 0 24 24" {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.5 6.5 2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" /></svg>;
    case "search":
      return <svg className={c} viewBox="0 0 24 24" {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "tv":
      return <svg className={c} viewBox="0 0 24 24" {...props}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m8 3 4 3 4-3" /></svg>;
    case "user":
      return <svg className={c} viewBox="0 0 24 24" {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></svg>;
    default:
      return null;
  }
}

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-bone/10 bg-ink-950/90 backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={t.icon} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
