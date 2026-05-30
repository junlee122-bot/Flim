import Link from "next/link";
import MoviePoster from "@/components/MoviePoster";
import EmptyState from "@/components/EmptyState";
import { getMovieList, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "최신 · 추천작",
  description: "지금 상영 중인 영화, 요즘 뜨는 작품, 개봉 예정작을 실시간으로.",
};

type Kind = "now_playing" | "trending" | "popular" | "upcoming";
const TABS: { key: Kind; label: string; desc: string }[] = [
  { key: "now_playing", label: "상영 중", desc: "지금 극장에서 볼 수 있는 영화" },
  { key: "trending", label: "요즘 뜨는", desc: "이번 주 가장 화제가 된 작품" },
  { key: "popular", label: "인기작", desc: "지금 가장 인기 있는 영화" },
  { key: "upcoming", label: "개봉 예정", desc: "곧 만나게 될 기대작" },
];

export default async function NowPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "now_playing") as Kind;
  const page = Math.max(1, Number(sp.page) || 1);
  const active = TABS.find((t) => t.key === tab)!;

  const { items, totalPages } = tmdbConfigured()
    ? await getMovieList(tab, page)
    : { items: [], totalPages: 0 };

  const href = (t: Kind, p: number) => `/now?tab=${t}${p > 1 ? `&page=${p}` : ""}`;
  const win: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) win.push(i);

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Now Showing</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          최신 · 추천작
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          {active.desc}. 실시간 정보라 매일 새로워집니다. (국내 KR 기준)
        </p>
      </header>

      {/* 탭 */}
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key, 1)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              t.key === tab
                ? "border-accent bg-accent/15 text-accent"
                : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((m) => (
            <MoviePoster
              key={m.tmdbId}
              tmdbId={m.tmdbId}
              title={m.title}
              originalTitle={m.originalTitle}
              year={m.year}
              posterUrl={m.posterUrl}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎬"
          title="목록을 불러올 수 없어요"
          description="잠시 후 다시 시도해 주세요."
        />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 pt-4">
          {page > 1 && (
            <Link href={href(tab, page - 1)} className={pageBtn}>‹</Link>
          )}
          {win.map((p) => (
            <Link
              key={p}
              href={href(tab, p)}
              className={
                p === page
                  ? "min-w-9 rounded-md bg-accent px-3 py-2 text-center text-sm tabular-nums text-ink-950"
                  : pageBtn
              }
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={href(tab, page + 1)} className={pageBtn}>›</Link>
          )}
        </nav>
      )}
    </div>
  );
}

const pageBtn =
  "min-w-9 rounded-md border border-bone/15 px-3 py-2 text-center text-sm tabular-nums text-muted transition hover:border-bone/40 hover:text-bone";
