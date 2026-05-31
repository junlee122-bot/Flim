"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";
import { useUserData } from "@/components/UserDataProvider";

export default function MyTopPage() {
  const { ready, ratings } = useUserData();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 별점 높은 순 TOP 10
  const top = Object.values(ratings)
    .sort((a, b) => b.rating - a.rating || b.at - a.at)
    .slice(0, 10);

  async function share() {
    const t = top.map((m) => m.title).join("|");
    const url = `${window.location.origin}/my/top`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "내 인생 영화 TOP 10 · FLIM", url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready || !mounted)
    return <div className="py-20 text-center text-muted">불러오는 중…</div>;

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <Link href="/my" className="link-underline text-xs text-muted">
          ← 마이
        </Link>
        <p className="kicker mt-4">My Top Films</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          내 인생 영화 TOP 10
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          내가 매긴 별점이 높은 순. 별점을 매길수록 정확해져요.
        </p>
      </header>

      {top.length > 0 ? (
        <>
          <ol className="space-y-3">
            {top.map((m, i) => (
              <li key={m.tmdbId} className="card flex items-center gap-4 p-3">
                <span className="headline w-8 shrink-0 text-center text-2xl text-accent">
                  {i + 1}
                </span>
                <Link href={`/movies/${m.tmdbId}`} className="w-12 shrink-0">
                  <div className="aspect-[2/3] overflow-hidden rounded-sm bg-ink-800">
                    {m.posterUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.posterUrl} alt={m.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/movies/${m.tmdbId}`} className="block truncate text-bone hover:text-accent-soft">
                    {m.title}
                    {m.year ? <span className="text-muted"> ({m.year})</span> : null}
                  </Link>
                  <StarRating value={m.rating} size={13} />
                </div>
              </li>
            ))}
          </ol>
          <div className="flex justify-center">
            <button onClick={share} className="btn btn-accent">
              {copied ? "링크 복사됨 ✓" : "내 TOP 10 공유하기"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="headline text-xl text-muted">아직 별점을 매긴 영화가 없어요</p>
          <p className="mt-2 text-sm text-faint">영화 상세에서 ‘내 별점’을 매겨보세요.</p>
          <Link href="/pick" className="btn btn-accent mt-6">오늘 볼 영화 고르기</Link>
        </div>
      )}
    </div>
  );
}
