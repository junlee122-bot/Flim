import Link from "next/link";
import { notFound } from "next/navigation";
import MoviePoster from "@/components/MoviePoster";
import CurationCard from "@/components/CurationCard";
import EmptyState from "@/components/EmptyState";
import { getMoviesByGenre, getCurationsBySlugs } from "@/lib/data";
import { GENRE_HUBS, getGenreHub } from "@/lib/genreHubs";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export function generateStaticParams() {
  return GENRE_HUBS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = getGenreHub(slug);
  if (!hub) return {};
  return { title: hub.label, description: hub.description };
}

export default async function GenreHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sub?: string }>;
}) {
  const { slug } = await params;
  const hub = getGenreHub(slug);
  if (!hub) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sub = hub.subFilters?.find((f) => f.key === sp.sub);

  const [{ movies, total }, curations] = await Promise.all([
    getMoviesByGenre({
      genres: hub.genres,
      page,
      pageSize: PAGE_SIZE,
      minVotes: 100,
      lang: sub?.lang,
      extraGenres: sub?.genres,
    }),
    getCurationsBySlugs(hub.curations),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number, subKey?: string) => {
    const u = new URLSearchParams();
    if (subKey) u.set("sub", subKey);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/genre/${slug}${s ? `?${s}` : ""}`;
  };
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
        <p className="kicker">{hub.kicker}</p>
        <h1 className="headline mt-3 max-w-2xl text-balance text-4xl leading-[1.12] sm:text-5xl">
          {hub.title}
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-bone/70">
          {hub.description}
        </p>
        <p className="mt-4 text-xs tabular-nums text-faint">
          {total.toLocaleString()}편
        </p>
      </header>

      {/* 관련 컬렉션 */}
      {curations.length > 0 && (
        <section>
          <div className="mb-5 border-b border-bone/10 pb-3">
            <p className="kicker">Collections</p>
            <h2 className="headline mt-2 text-2xl">{hub.label} 컬렉션</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {curations.map((c) => (
              <CurationCard key={c.id} curation={c} />
            ))}
          </div>
        </section>
      )}

      {/* 전체 목록 */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-bone/10 pb-3">
          <div>
            <p className="kicker">All Titles</p>
            <h2 className="headline mt-2 text-2xl">전체 {hub.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* 하위 필터(언어 등) */}
            {hub.subFilters && (
              <div className="flex gap-2">
                <Link
                  href={qs(1)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    !sub ? "border-accent bg-accent/15 text-accent" : "border-bone/15 text-muted hover:text-bone"
                  }`}
                >
                  전체
                </Link>
                {hub.subFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={qs(1, f.key)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      sub?.key === f.key ? "border-accent bg-accent/15 text-accent" : "border-bone/15 text-muted hover:text-bone"
                    }`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            )}
            <span className="text-sm text-faint">{page} / {totalPages}</span>
          </div>
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
          <EmptyState icon="🎞️" title="작품이 아직 없어요" description="카탈로그가 채워지면 표시됩니다." />
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1.5">
            {page > 1 && (
              <Link href={qs(page - 1, sub?.key)} className="rounded-md border border-bone/15 px-3 py-2 text-sm text-muted transition hover:border-bone/40 hover:text-bone">‹</Link>
            )}
            {win.map((p) => (
              <Link
                key={p}
                href={qs(p, sub?.key)}
                className={`min-w-9 rounded-md px-3 py-2 text-center text-sm tabular-nums transition ${
                  p === page ? "bg-accent text-ink-950" : "border border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link href={qs(page + 1, sub?.key)} className="rounded-md border border-bone/15 px-3 py-2 text-sm text-muted transition hover:border-bone/40 hover:text-bone">›</Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
