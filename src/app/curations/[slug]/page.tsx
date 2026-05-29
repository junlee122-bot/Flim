import Link from "next/link";
import { notFound } from "next/navigation";
import MoviePoster from "@/components/MoviePoster";
import { getCurationBySlug } from "@/lib/data";
import { CATEGORY_META, categoryOf } from "@/lib/categories";

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
  const cat = CATEGORY_META[categoryOf(curation.slug)];

  // 헤더 백드롭: 담긴 영화 중 백드롭이 있는 첫 작품
  const backdrop = movies.find((m) => m.backdrop_path)?.backdrop_path ?? null;

  return (
    <div className="space-y-12">
      <header className="relative -mx-5 -mt-12 overflow-hidden px-5 pb-8 pt-16 sm:-mx-8 sm:px-8 sm:pt-20">
        {backdrop && (
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={backdrop}
              alt=""
              className="h-full w-full object-cover object-top opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/50" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/40 to-transparent" />
          </div>
        )}
        <Link href="/curations" className="link-underline text-xs text-muted">
          ← 큐레이션
        </Link>
        <p className="kicker mt-5">{cat.kicker}</p>
        <h1 className="headline mt-3 text-balance text-4xl leading-tight sm:text-5xl">
          {curation.title}
        </h1>
        {curation.description && (
          <p className="mt-5 max-w-prose text-pretty leading-relaxed text-bone/70">
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
