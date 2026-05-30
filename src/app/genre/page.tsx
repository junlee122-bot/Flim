import Link from "next/link";
import { GENRE_HUBS } from "@/lib/genreHubs";
import { getCurationsBySlugs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "장르",
  description: "애니메이션·SF·호러·다큐멘터리·스릴러·로맨스 — 장르별 영화 허브.",
};

export default async function GenreIndexPage() {
  // 각 허브의 대표 포스터 몇 장 (관련 큐레이션에서)
  const hubsWithPosters = await Promise.all(
    GENRE_HUBS.map(async (h) => {
      const cur = await getCurationsBySlugs(h.curations);
      const posters = Array.from(
        new Set(cur.flatMap((c) => c.posters)),
      ).slice(0, 4);
      return { hub: h, posters };
    }),
  );

  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Genres</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          장르로 탐험하기
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          마음이 향하는 장르를 골라보세요. 각 장르의 명작과 큐레이션이 기다립니다.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hubsWithPosters.map(({ hub, posters }) => (
          <Link
            key={hub.slug}
            href={`/genre/${hub.slug}`}
            className="card card-hover group flex flex-col overflow-hidden"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-ink-800">
              {posters.length > 0 ? (
                <div
                  className="grid h-full w-full"
                  style={{ gridTemplateColumns: `repeat(${Math.min(posters.length, 4)}, 1fr)` }}
                >
                  {posters.map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={p}
                      alt=""
                      className="h-full w-full object-cover transition duration-[800ms] ease-smooth group-hover:scale-105"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="headline text-2xl text-faint">{hub.kicker}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <p className="kicker text-faint">{hub.kicker}</p>
                <h2 className="headline mt-1 text-2xl text-bone transition-colors group-hover:text-accent-soft">
                  {hub.label}
                </h2>
              </div>
            </div>
            <p className="flex-1 p-5 text-sm leading-relaxed text-muted">
              {hub.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
