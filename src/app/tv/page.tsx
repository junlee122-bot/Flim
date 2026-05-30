import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { browseSeries } from "@/lib/data";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export const metadata = {
  title: "TV 시리즈",
  description: "정주행할 드라마와 시리즈. TMDb 평점 기반 큐레이션.",
};

const GENRES = ["드라마", "범죄", "미스터리", "SF&판타지", "애니메이션", "코미디", "다큐멘터리", "액션&어드벤처"];

export default async function TvPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; genre?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const genre = sp.genre || "";
  const sort = (sp.sort === "popular" ? "popular" : "rating") as "rating" | "popular";

  const { series, total } = await browseSeries({ page, pageSize: PAGE_SIZE, genre: genre || undefined, sort });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const cur = { genre: genre || undefined, sort: sort !== "rating" ? sort : undefined, page: page > 1 ? String(page) : undefined, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/tv?${s}` : "/tv";
  };
  const win: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) win.push(i);

  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">TV Series</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">정주행할 시리즈</h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          한 편의 영화로 끝나지 않는 이야기. 드라마와 시리즈를 모았습니다.
        </p>
        <p className="mt-3 text-xs tabular-nums text-faint">{total.toLocaleString()}편</p>
      </header>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={qs({ genre: undefined, page: undefined })} className={chip(!genre)}>전체</Link>
        {GENRES.map((g) => (
          <Link key={g} href={qs({ genre: genre === g ? undefined : g, page: undefined })} className={chip(genre === g)}>{g}</Link>
        ))}
        <span className="mx-1 text-faint">·</span>
        <Link href={qs({ sort: undefined, page: undefined })} className={chip(sort === "rating")}>평점순</Link>
        <Link href={qs({ sort: "popular", page: undefined })} className={chip(sort === "popular")}>인기순</Link>
      </div>

      {series.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {series.map((s) => (
            <Link key={s.tmdb_id} href={`/series/${s.tmdb_id}`} className="group block">
              <div className="aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/40">
                {s.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.poster_path} alt={s.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                )}
              </div>
              <p className="mt-2.5 truncate text-sm text-bone group-hover:text-accent-soft">
                {s.name}{s.first_air_year ? <span className="text-muted"> ({s.first_air_year})</span> : null}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="📺" title="시리즈가 아직 없어요" description="TV 데이터가 적재되면 표시됩니다. (series 테이블 + bulk-series.mjs)" />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 pt-4">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className={pageBtn(false)}>‹</Link>}
          {win.map((p) => <Link key={p} href={qs({ page: String(p) })} className={p === page ? "min-w-9 rounded-md bg-accent px-3 py-2 text-center text-sm tabular-nums text-ink-950" : pageBtn(false)}>{p}</Link>)}
          {page < totalPages && <Link href={qs({ page: String(page + 1) })} className={pageBtn(false)}>›</Link>}
        </nav>
      )}
    </div>
  );
}

const chip = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-accent bg-accent/15 text-accent" : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"}`;
const pageBtn = (active: boolean) =>
  `min-w-9 rounded-md border px-3 py-2 text-center text-sm tabular-nums transition ${active ? "border-accent text-accent" : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"}`;
