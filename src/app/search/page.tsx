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
    <div className="space-y-8">
      <div>
        <p className="kicker">SEARCH</p>
        <h1 className="headline mt-1 text-3xl">영화 검색</h1>
      </div>

      <div className="max-w-2xl">
        <SearchBar initial={q} />
      </div>

      {!tmdbConfigured() && (
        <p className="rounded-sm border border-accent/30 bg-accent/5 p-4 text-sm text-bone/80">
          TMDb API 키가 설정되지 않았습니다. <code>.env.local</code> 에{" "}
          <code>TMDB_API_KEY</code> 또는 <code>TMDB_ACCESS_TOKEN</code> 을
          추가하세요.
        </p>
      )}

      {q && (
        <p className="text-sm text-muted">
          “{q}” 검색 결과 {results.length}건
        </p>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
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
        <p className="text-muted">검색 결과가 없습니다.</p>
      ) : null}
    </div>
  );
}
