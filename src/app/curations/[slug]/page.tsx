import Link from "next/link";
import { notFound } from "next/navigation";
import MoviePoster from "@/components/MoviePoster";
import { getCurationBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CurationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getCurationBySlug(slug);
  if (!result) notFound();
  const { curation, movies } = result;

  return (
    <div className="space-y-12">
      <header className="animate-fade-up border-b border-bone/10 pb-8">
        <Link
          href="/#curations"
          className="link-underline text-xs text-muted"
        >
          ← 큐레이션
        </Link>
        <p className="kicker mt-5">Collection</p>
        <h1 className="headline mt-3 text-balance text-4xl leading-tight sm:text-5xl">
          {curation.title}
        </h1>
        {curation.description && (
          <p className="mt-5 max-w-prose text-pretty leading-relaxed text-muted">
            {curation.description}
          </p>
        )}
        <p className="mt-5 text-xs tabular-nums text-faint">
          {movies.length}편의 작품
        </p>
      </header>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {movies.map((m, i) => (
            <MoviePoster
              key={m.tmdb_id}
              tmdbId={m.tmdb_id}
              title={m.title}
              originalTitle={m.original_title}
              year={m.release_year}
              posterUrl={m.poster_path}
              meta={m.director}
              rank={i + 1}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center text-sm text-muted">
          이 큐레이션에 담긴 영화가 아직 없습니다.
        </p>
      )}
    </div>
  );
}
