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
    <div className="space-y-8">
      <header className="border-b border-bone/10 pb-5">
        <p className="kicker">CURATION</p>
        <h1 className="headline mt-1 text-4xl">{curation.title}</h1>
        {curation.description && (
          <p className="mt-3 max-w-2xl text-muted">{curation.description}</p>
        )}
      </header>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {movies.map((m) => (
            <MoviePoster
              key={m.tmdb_id}
              tmdbId={m.tmdb_id}
              title={m.title}
              originalTitle={m.original_title}
              year={m.release_year}
              posterUrl={m.poster_path}
              meta={m.director}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted">이 큐레이션에 담긴 영화가 아직 없습니다.</p>
      )}
    </div>
  );
}
