import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { discoverByProvider, OTT_PROVIDERS, TMDB_GENRES, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "OTT로 보기",
  description: "넷플릭스·디즈니+·왓챠·티빙·웨이브에서 지금 볼 수 있는 영화/시리즈.",
};

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ ott?: string; kind?: string; genre?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const ott = OTT_PROVIDERS.find((p) => p.key === sp.ott) ?? OTT_PROVIDERS[0];
  const kind = (sp.kind === "tv" ? "tv" : "movie") as "movie" | "tv";
  const genreId = sp.genre ? Number(sp.genre) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const { items, totalPages } = tmdbConfigured()
    ? await discoverByProvider({ providerId: ott.id, kind, genre: genreId, page })
    : { items: [], totalPages: 0 };

  const href = (patch: Record<string, string | undefined>) => {
    const cur = {
      ott: ott.key, kind, genre: sp.genre, page: page > 1 ? String(page) : undefined, ...patch,
    };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) if (v) u.set(k, v);
    return `/watch?${u.toString()}`;
  };
  const win: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) win.push(i);

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Where to Watch</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          OTT로 보기
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          내가 구독한 서비스에서 지금 볼 수 있는 작품만 골라보세요. (국내 KR 기준)
        </p>
      </header>

      {/* OTT 선택 */}
      <div className="flex flex-wrap gap-2">
        {OTT_PROVIDERS.map((p) => (
          <Link
            key={p.key}
            href={href({ ott: p.key, page: undefined })}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              p.key === ott.key
                ? "border-accent bg-accent/15 text-accent"
                : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* 영화/시리즈 + 장르 */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={href({ kind: "movie", page: undefined })} className={chip(kind === "movie")}>영화</Link>
        <Link href={href({ kind: "tv", page: undefined })} className={chip(kind === "tv")}>시리즈</Link>
        <span className="mx-1 text-faint">·</span>
        <Link href={href({ genre: undefined, page: undefined })} className={chip(!genreId)}>전체 장르</Link>
        {TMDB_GENRES.slice(0, 10).map((g) => (
          <Link
            key={g.id}
            href={href({ genre: genreId === g.id ? undefined : String(g.id), page: undefined })}
            className={chip(genreId === g.id)}
          >
            {g.name}
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted">
        <span className="text-bone">{ott.label}</span> ·{" "}
        {kind === "tv" ? "시리즈" : "영화"} {items.length > 0 ? `· ${page}/${totalPages} 페이지` : ""}
      </p>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((m) => (
            <Link key={m.tmdbId} href={`${kind === "tv" ? "/series" : "/movies"}/${m.tmdbId}`} className="group block">
              <div className="aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/40">
                {m.posterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.posterUrl} alt={m.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                )}
              </div>
              <p className="mt-2.5 truncate text-sm text-bone group-hover:text-accent-soft">
                {m.title}{m.year ? <span className="text-muted"> ({m.year})</span> : null}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="📺" title={`${ott.label}에서 볼 작품을 찾지 못했어요`} description="다른 OTT나 장르로 바꿔보세요." />
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1.5 pt-4">
          {page > 1 && <Link href={href({ page: String(page - 1) })} className={pageBtn}>‹</Link>}
          {win.map((p) => (
            <Link key={p} href={href({ page: String(p) })} className={p === page ? "min-w-9 rounded-md bg-accent px-3 py-2 text-center text-sm tabular-nums text-ink-950" : pageBtn}>{p}</Link>
          ))}
          {page < totalPages && <Link href={href({ page: String(page + 1) })} className={pageBtn}>›</Link>}
        </nav>
      )}
    </div>
  );
}

const chip = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition ${active ? "border-accent bg-accent/15 text-accent" : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"}`;
const pageBtn =
  "min-w-9 rounded-md border border-bone/15 px-3 py-2 text-center text-sm tabular-nums text-muted transition hover:border-bone/40 hover:text-bone";
