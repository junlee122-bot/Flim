import Link from "next/link";
import MoviePoster from "@/components/MoviePoster";
import CurationCard from "@/components/CurationCard";
import EmptyState from "@/components/EmptyState";
import { getMoviesByGenre, getCurationsBySlugs } from "@/lib/data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
// 애니 허브에 띄울 관련 큐레이션 (있는 것만 자동 노출)
const ANIM_CURATIONS = [
  "genre-animation",
  "japan-animation",
  "animation-classics",
  "ghibli",
  "miyazaki",
  "shinkai",
  "kon",
  "hosoda",
  "miyazaki-isao",
];

export const metadata = {
  title: "애니메이션",
  description: "지브리부터 신카이 마코토까지, 그림이 도달한 예술 — 애니메이션 컬렉션.",
};

export default async function AnimationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ movies, total }, curations] = await Promise.all([
    getMoviesByGenre({ genres: ["애니메이션"], page, pageSize: PAGE_SIZE, minVotes: 100 }),
    getCurationsBySlugs(ANIM_CURATIONS),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/animation?page=${p}`;
  const win: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) win.push(i);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <header className="relative -mx-5 -mt-12 overflow-hidden px-5 pb-2 pt-16 sm:-mx-8 sm:px-8 sm:pt-20">
        {curations[0]?.posters?.[0] && (
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute inset-y-0 right-0 hidden w-[55%] grid-cols-4 gap-1.5 opacity-40 lg:grid">
              {curations
                .flatMap((c) => c.posters)
                .slice(0, 12)
                .map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={p} alt="" className="aspect-[2/3] h-full w-full rounded-sm object-cover" />
                ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
          </div>
        )}
        <p className="kicker">Animation</p>
        <h1 className="headline mt-3 max-w-2xl text-balance text-4xl leading-[1.12] sm:text-5xl">
          그림이 도달한 예술, 애니메이션
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-bone/70">
          지브리의 손그림부터 신카이 마코토의 빛, 곤 사토시의 환상까지. 장르의
          경계를 넘는 애니메이션을 모았습니다.
        </p>
        <p className="mt-4 text-xs tabular-nums text-faint">
          애니메이션 {total.toLocaleString()}편
        </p>
      </header>

      {/* 관련 컬렉션 */}
      {curations.length > 0 && (
        <section>
          <div className="mb-5 border-b border-bone/10 pb-3">
            <p className="kicker">Collections</p>
            <h2 className="headline mt-2 text-2xl">애니메이션 컬렉션</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {curations.map((c) => (
              <CurationCard key={c.id} curation={c} />
            ))}
          </div>
        </section>
      )}

      {/* 전체 애니메이션 */}
      <section>
        <div className="mb-5 flex items-end justify-between border-b border-bone/10 pb-3">
          <div>
            <p className="kicker">All Animation</p>
            <h2 className="headline mt-2 text-2xl">전체 애니메이션</h2>
          </div>
          <span className="text-sm text-faint">
            {page} / {totalPages}
          </span>
        </div>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {movies.map((m) => (
              <MoviePoster
                key={m.tmdb_id}
                tmdbId={m.tmdb_id}
                title={m.title}
                originalTitle={m.original_title}
                year={m.release_year}
                posterUrl={m.poster_path}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🎞️"
            title="애니메이션이 아직 없어요"
            description="카탈로그가 채워지면 여기에 표시됩니다."
          />
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1.5">
            {page > 1 && (
              <Link
                href={href(page - 1)}
                className="rounded-md border border-bone/15 px-3 py-2 text-sm text-muted transition hover:border-bone/40 hover:text-bone"
              >
                ‹
              </Link>
            )}
            {win.map((p) => (
              <Link
                key={p}
                href={href(p)}
                className={`min-w-9 rounded-md px-3 py-2 text-center text-sm tabular-nums transition ${
                  p === page
                    ? "bg-accent text-ink-950"
                    : "border border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={href(page + 1)}
                className="rounded-md border border-bone/15 px-3 py-2 text-sm text-muted transition hover:border-bone/40 hover:text-bone"
              >
                ›
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
