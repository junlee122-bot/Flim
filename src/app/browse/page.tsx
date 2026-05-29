import Link from "next/link";
import MoviePoster from "@/components/MoviePoster";
import { browseMovies, type BrowseSort } from "@/lib/data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 36;
const SORTS: { key: BrowseSort; label: string }[] = [
  { key: "rating", label: "평점순" },
  { key: "year", label: "최신순" },
  { key: "title", label: "제목순" },
];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = (SORTS.some((s) => s.key === sp.sort) ? sp.sort : "rating") as BrowseSort;
  const page = Math.max(1, Number(sp.page) || 1);

  const { movies, total } = await browseMovies({ sort, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number, s: BrowseSort = sort) =>
    `/browse?sort=${s}&page=${p}`;

  // 페이지 번호 윈도우 (현재 주변 ±2)
  const win: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    win.push(i);

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Catalog</p>
        <h1 className="headline mt-2 text-4xl leading-tight sm:text-5xl">
          전체 카탈로그
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          아카이브에 적재된 모든 작품을 둘러보세요.
        </p>
        <p className="mt-3 text-xs tabular-nums text-faint">
          총 {total.toLocaleString()}편 · {page} / {totalPages} 페이지
        </p>
      </header>

      {/* 정렬 탭 */}
      <nav className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={href(1, s.key)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              s.key === sort
                ? "border-accent bg-accent/15 text-accent"
                : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

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
        <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center text-sm text-muted">
          표시할 작품이 없습니다.
        </p>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 pt-4">
          <PageLink href={href(1)} disabled={page === 1} label="«" />
          <PageLink href={href(page - 1)} disabled={page === 1} label="‹" />
          {win[0] > 1 && <span className="px-2 text-faint">…</span>}
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
          {win[win.length - 1] < totalPages && (
            <span className="px-2 text-faint">…</span>
          )}
          <PageLink href={href(page + 1)} disabled={page === totalPages} label="›" />
          <PageLink href={href(totalPages)} disabled={page === totalPages} label="»" />
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled)
    return (
      <span className="min-w-9 rounded-md border border-bone/10 px-3 py-2 text-center text-sm text-faint/40">
        {label}
      </span>
    );
  return (
    <Link
      href={href}
      className="min-w-9 rounded-md border border-bone/15 px-3 py-2 text-center text-sm text-muted transition hover:border-bone/40 hover:text-bone"
    >
      {label}
    </Link>
  );
}
