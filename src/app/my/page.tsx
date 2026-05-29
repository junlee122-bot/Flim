"use client";

import { useState } from "react";
import Link from "next/link";
import StarRating from "@/components/StarRating";
import { useUserData } from "@/components/UserDataProvider";

export default function MyPage() {
  const { ready, user, ratings, watched, unrate, signIn, signOut } = useUserData();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const rated = Object.values(ratings).sort((a, b) => b.at - a.at);
  const avg = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0;

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMsg(null);
    const r = await signIn(email.trim());
    setSending(false);
    setMsg(r === "ok" ? "로그인 링크를 이메일로 보냈어요. 메일함을 확인하세요." : r);
  }

  if (!ready) return <div className="py-20 text-center text-muted">불러오는 중…</div>;

  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">My Page</p>
        <h1 className="headline mt-2 text-4xl leading-tight sm:text-5xl">마이 페이지</h1>

        {/* 계정 상태 */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          {user ? (
            <>
              <span className="text-muted">
                <span className="text-bone">{user.email}</span> 로 로그인됨 ·{" "}
                <span className="text-accent">기기 간 동기화 켜짐</span>
              </span>
              <button onClick={signOut} className="text-faint underline hover:text-bone">
                로그아웃
              </button>
            </>
          ) : (
            <span className="text-muted">
              이 브라우저에만 저장 중 · 로그인하면 기기 간 동기화됩니다.
            </span>
          )}
        </div>

        {/* 로그인 폼 */}
        {!user && (
          <form onSubmit={onSignIn} className="mt-4 flex max-w-md flex-wrap gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일로 로그인 링크 받기"
              className="field flex-1"
            />
            <button className="btn btn-accent" disabled={sending}>
              {sending ? "전송 중…" : "링크 받기"}
            </button>
          </form>
        )}
        {msg && <p className="mt-2 text-sm text-accent-soft">{msg}</p>}

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-muted">
            별점 <span className="tabular-nums text-accent">{rated.length}</span>편
          </span>
          {rated.length > 0 && (
            <span className="text-muted">
              평균 <span className="tabular-nums text-accent">{avg.toFixed(2)}</span>
            </span>
          )}
          <span className="text-muted">
            봤어요 <span className="tabular-nums text-accent">{watched.length}</span>편
          </span>
        </div>
      </header>

      <section>
        <div className="mb-5 border-b border-bone/10 pb-3">
          <p className="kicker">My Ratings</p>
          <h2 className="headline mt-2 text-2xl">내 별점</h2>
        </div>

        {rated.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {rated.map((m) => (
              <li key={m.tmdbId} className="group">
                <Link href={`/movies/${m.tmdbId}`} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10">
                    {m.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted">
                        {m.title}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="mt-2">
                  <p className="truncate text-sm text-bone">
                    {m.title}
                    {m.year ? <span className="text-muted"> ({m.year})</span> : null}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <StarRating value={m.rating} size={13} />
                    <button
                      onClick={() => unrate(m.tmdbId)}
                      className="text-xs text-faint hover:text-red-400"
                      title="별점 삭제"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
            <p className="headline text-xl text-muted">아직 별점을 매긴 영화가 없어요</p>
            <p className="mt-2 text-sm text-faint">
              영화 상세 페이지에서 ‘내 별점’을 눌러 기록해 보세요.
            </p>
            <Link href="/pick" className="btn btn-accent mt-6">
              오늘 볼 영화 고르기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
