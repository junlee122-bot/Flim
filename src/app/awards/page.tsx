import Link from "next/link";
import AwardBadge, { festivalKeyOf } from "@/components/AwardBadge";
import { getAllAwards } from "@/lib/data";
import { FESTIVALS } from "@/lib/festivals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "수상작",
  description: "오스카·칸·베니스·베를린·골든글로브·BAFTA 수상작 한눈에.",
};

export default async function AwardsHub() {
  const all = await getAllAwards();
  const slam = all.filter((a) => new Set(a.awards.map((x) => x.festival)).size >= 2);

  return (
    <div className="space-y-12">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Awards</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          수상작 아카이브
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          세계 주요 시상식이 호명한 작품들. 영화제별로 둘러보거나, 여러 무대를
          석권한 작품을 만나보세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {FESTIVALS.map((f) => (
            <Link
              key={f.slug}
              href={`/festivals/${f.slug}`}
              className="flex items-center gap-2 rounded-full border border-bone/15 px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-accent"
            >
              <AwardBadge festival={f.matchFestivals[0]} size={20} />
              {f.name}
            </Link>
          ))}
        </div>
      </header>

      {/* 그랜드 슬램 — 여러 영화제 석권 */}
      {slam.length > 0 && (
        <section>
          <div className="mb-5 border-b border-bone/10 pb-3">
            <p className="kicker">Grand Slam</p>
            <h2 className="headline mt-2 text-2xl">여러 무대를 석권한 작품</h2>
          </div>
          <ul className="space-y-3">
            {slam.map((a) => (
              <li
                key={a.movie.id}
                className="card flex items-center gap-4 p-4"
              >
                <Link href={`/movies/${a.movie.tmdb_id}`} className="w-12 shrink-0">
                  <div className="aspect-[2/3] overflow-hidden rounded-sm bg-ink-800">
                    {a.movie.poster_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.movie.poster_path} alt={a.movie.title} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/movies/${a.movie.tmdb_id}`}
                    className="headline text-lg text-bone hover:text-accent-soft"
                  >
                    {a.movie.title}
                    {a.movie.release_year ? (
                      <span className="text-muted"> ({a.movie.release_year})</span>
                    ) : null}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {[...new Set(a.awards.map((x) => x.festival))].map((fest) => (
                      <span
                        key={fest}
                        className="flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-xs text-bone/80"
                      >
                        <AwardBadge festival={fest} size={14} />
                        {fest}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-accent">
                  {a.awards.length}관왕
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 전체 수상작 */}
      <section>
        <div className="mb-5 border-b border-bone/10 pb-3">
          <p className="kicker">All Winners</p>
          <h2 className="headline mt-2 text-2xl">전체 수상작</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {all.map((a) => (
            <Link key={a.movie.id} href={`/movies/${a.movie.tmdb_id}`} className="group block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/40">
                {a.movie.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.movie.poster_path} alt={a.movie.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                )}
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-0.5 text-[0.65rem] text-accent backdrop-blur-sm">
                  <AwardBadge festival={a.awards[0].festival} size={12} />
                  {a.awards.length}
                </span>
              </div>
              <p className="mt-2.5 truncate text-sm text-bone group-hover:text-accent-soft">
                {a.movie.title}
                {a.movie.release_year ? <span className="text-muted"> ({a.movie.release_year})</span> : null}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
