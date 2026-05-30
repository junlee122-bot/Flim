import Link from "next/link";
import { notFound } from "next/navigation";
import MoviePoster from "@/components/MoviePoster";
import AwardBadge from "@/components/AwardBadge";
import EmptyState from "@/components/EmptyState";
import { FESTIVALS, getFestival } from "@/lib/festivals";
import { getFestivalWinners } from "@/lib/data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return FESTIVALS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFestival(slug);
  return f ? { title: f.name, description: f.blurb } : {};
}

export default async function FestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFestival(slug);
  if (!f) notFound();

  const winners = await getFestivalWinners(f.matchFestivals);
  const won = winners.filter((w) => w.result === "won");
  const nominated = winners.filter((w) => w.result !== "won");

  return (
    <div className="space-y-12">
      {/* Hero */}
      <header className="animate-fade-up">
        <Link href="/festivals" className="link-underline text-xs text-muted">
          ← 영화제
        </Link>
        <div className="mt-5 flex items-start gap-5 sm:gap-7">
          <div className="shrink-0">
            <AwardBadge festival={f.matchFestivals[0]} size={72} />
          </div>
          <div>
            <p className="kicker">{f.origName}</p>
            <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
              {f.name}
            </h1>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>🏆 {f.topPrize}</span>
              <span>· {f.country}</span>
              <span>· {f.since}년 시작</span>
              <span>· {f.month}</span>
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-prose text-pretty text-lg leading-relaxed text-bone/85">
          {f.description}
        </p>
      </header>

      {/* 수상작 */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-bone/10 pb-3">
          <div>
            <p className="kicker">Winners</p>
            <h2 className="headline mt-2 text-2xl">
              {f.topPrize.split(" ")[0]} 수상작
            </h2>
          </div>
          {won.length > 0 && (
            <span className="text-sm tabular-nums text-faint">{won.length}편</span>
          )}
        </div>
        {won.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {won.map((w) => (
              <MoviePoster
                key={`${w.movie.tmdb_id}-${w.category}`}
                tmdbId={w.movie.tmdb_id}
                title={w.movie.title}
                originalTitle={w.movie.original_title}
                year={w.movie.release_year}
                posterUrl={w.movie.poster_path}
                meta={[w.category, w.year ? String(w.year) : null].filter(Boolean).join(" · ")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🏆"
            title="등록된 수상작이 아직 없어요"
            description="관리자 페이지에서 이 영화제의 수상작을 추가할 수 있습니다."
          />
        )}
      </section>

      {/* 후보작 (있으면) */}
      {nominated.length > 0 && (
        <section>
          <div className="mb-5 border-b border-bone/10 pb-3">
            <p className="kicker">Nominees</p>
            <h2 className="headline mt-2 text-2xl">후보작</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {nominated.map((w) => (
              <MoviePoster
                key={`${w.movie.tmdb_id}-${w.category}`}
                tmdbId={w.movie.tmdb_id}
                title={w.movie.title}
                originalTitle={w.movie.original_title}
                year={w.movie.release_year}
                posterUrl={w.movie.poster_path}
                meta={[w.category, w.year ? String(w.year) : null].filter(Boolean).join(" · ")}
              />
            ))}
          </div>
        </section>
      )}

      {/* 다른 영화제 */}
      <section>
        <div className="mb-4 border-b border-bone/10 pb-2">
          <p className="kicker">More</p>
          <h2 className="headline mt-2 text-xl">다른 영화제</h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {FESTIVALS.filter((x) => x.slug !== f.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/festivals/${x.slug}`}
              className="flex items-center gap-2 rounded-full border border-bone/15 px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <AwardBadge festival={x.matchFestivals[0]} size={20} />
              {x.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
