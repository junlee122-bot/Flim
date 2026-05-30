import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import MoviePoster from "@/components/MoviePoster";
import {
  searchMovies,
  searchTv,
  discoverMovies,
  tmdbConfigured,
  TMDB_GENRES,
  DECADES,
} from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; decade?: string }>;
}) {
  const { q = "", genre = "", decade = "" } = await searchParams;
  const genreId = genre ? Number(genre) : undefined;
  const hasFilter = Boolean(genreId || decade);

  // 텍스트 검색이 있으면 검색 우선, 없고 필터가 있으면 discover
  let results: Awaited<ReturnType<typeof searchMovies>> = [];
  let tvResults: Awaited<ReturnType<typeof searchTv>> = [];
  if (q) {
    [results, tvResults] = await Promise.all([searchMovies(q), searchTv(q)]);
  } else if (hasFilter) {
    results = await discoverMovies({ genre: genreId, decade });
  }

  // 필터 칩의 현재 상태를 유지하며 토글하는 URL 빌더
  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { q: q || undefined, genre: genre || undefined, decade: decade || undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/search?${s}` : "/search";
  };

  const activeGenre = TMDB_GENRES.find((g) => g.id === genreId);
  const activeDecade = DECADES.find((d) => d.key === decade);

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="kicker">Search</p>
        <h1 className="headline mt-2 text-3xl sm:text-4xl">영화 검색</h1>
      </header>

      <div className="animate-fade-up">
        <SearchBar initial={q} autoFocus={!q && !hasFilter} />
      </div>

      {!tmdbConfigured() && (
        <p className="rounded-md border border-accent/30 bg-accent/[0.06] p-4 text-sm leading-relaxed text-bone/80">
          TMDb API 키가 설정되지 않았습니다.
        </p>
      )}

      {/* 필터 — 텍스트 검색이 없을 때 노출 (둘러보기 모드) */}
      {!q && (
        <div className="space-y-3 animate-fade-up">
          <FilterRow label="장르">
            {TMDB_GENRES.map((g) => (
              <FilterChip
                key={g.id}
                href={buildHref({ genre: genreId === g.id ? undefined : String(g.id) })}
                active={genreId === g.id}
              >
                {g.name}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="연대">
            {DECADES.map((d) => (
              <FilterChip
                key={d.key}
                href={buildHref({ decade: decade === d.key ? undefined : d.key })}
                active={decade === d.key}
              >
                {d.label}
              </FilterChip>
            ))}
          </FilterRow>
        </div>
      )}

      {q ? (
        <p className="text-sm text-muted">
          <span className="text-bone">“{q}”</span> 검색 결과{" "}
          <span className="tabular-nums text-accent">{results.length}</span>건
        </p>
      ) : hasFilter ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {activeGenre && <span className="text-bone">{activeGenre.name}</span>}
          {activeDecade && <span className="text-bone">{activeDecade.label}</span>}
          <span>· 평점순 {results.length}편</span>
          <Link href="/search" className="link-underline text-xs text-faint">
            필터 초기화
          </Link>
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {results.map((m) => (
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
      ) : q && results.length === 0 && tvResults.length === 0 && tmdbConfigured() ? (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="headline text-xl text-muted">검색 결과가 없습니다</p>
          <p className="mt-2 text-sm text-faint">
            철자를 확인하거나 원제(영문) 또는 다른 제목으로 검색해 보세요.
          </p>
        </div>
      ) : !q && !hasFilter ? (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="text-sm text-muted">
            제목으로 검색하거나, 위 필터로 장르·연대를 골라 둘러보세요.
          </p>
        </div>
      ) : null}

      {/* TV 시리즈 결과 */}
      {q && tvResults.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3 border-b border-bone/10 pb-2">
            <h2 className="headline text-xl">TV 시리즈</h2>
            <span className="text-sm tabular-nums text-accent">{tvResults.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {tvResults.map((t) => (
              <Link key={t.tmdbId} href={`/series/${t.tmdbId}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/40">
                  {t.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.posterUrl} alt={t.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted">{t.name}</div>
                  )}
                </div>
                <p className="mt-2.5 truncate text-sm text-bone group-hover:text-accent-soft">
                  {t.name}{t.year ? <span className="text-muted"> ({t.year})</span> : null}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 w-8 shrink-0 text-xs uppercase tracking-wider text-faint">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
      }`}
    >
      {children}
    </Link>
  );
}
