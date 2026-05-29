import SearchBar from "@/components/SearchBar";
import MoviePoster from "@/components/MoviePoster";
import { searchMovies, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q ? await searchMovies(q) : [];

  return (
    <div className="space-y-10">
      <header className="animate-fade-up">
        <p className="kicker">Search</p>
        <h1 className="headline mt-2 text-3xl sm:text-4xl">영화 검색</h1>
      </header>

      <div className="animate-fade-up">
        <SearchBar initial={q} autoFocus={!q} />
      </div>

      {!tmdbConfigured() && (
        <p className="rounded-md border border-accent/30 bg-accent/[0.06] p-4 text-sm leading-relaxed text-bone/80">
          TMDb API 키가 설정되지 않았습니다.{" "}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">.env.local</code>{" "}
          에{" "}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">TMDB_API_KEY</code>{" "}
          또는{" "}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
            TMDB_ACCESS_TOKEN
          </code>{" "}
          을 추가하세요.
        </p>
      )}

      {q && (
        <p className="text-sm text-muted">
          <span className="text-bone">“{q}”</span> 검색 결과{" "}
          <span className="tabular-nums text-accent">{results.length}</span>건
        </p>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
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
      ) : q && tmdbConfigured() ? (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="headline text-xl text-muted">검색 결과가 없습니다</p>
          <p className="mt-2 text-sm text-faint">
            철자를 확인하거나 원제(영문) 또는 다른 제목으로 검색해 보세요.
          </p>
        </div>
      ) : !q ? (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="text-sm text-muted">
            제목을 입력해 영화를 찾아보세요.
          </p>
        </div>
      ) : null}
    </div>
  );
}
