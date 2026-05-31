import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getMovieDetail, getMovieProviders } from "@/lib/tmdb";
import type { MovieDetail, WatchProviders } from "@/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "영화 비교",
  description: "두 영화를 나란히 비교 — 평점·러닝타임·장르·OTT.",
};

async function load(id?: string) {
  const n = Number(id);
  if (!id || !Number.isFinite(n)) return null;
  const [detail, providers] = await Promise.all([
    getMovieDetail(n),
    getMovieProviders(n),
  ]);
  return detail ? { detail, providers } : null;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const [A, B] = await Promise.all([load(a), load(b)]);

  return (
    <div className="space-y-8">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Compare</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          영화 비교
        </h1>
        <p className="mt-4 text-pretty leading-relaxed text-muted">
          두 영화를 나란히 두고 평점·러닝타임·장르·시청처를 비교해 보세요.
          {!A || !B ? " 검색해서 영화를 고르면 됩니다." : ""}
        </p>
      </header>

      {!A || !B ? (
        <div className="space-y-5">
          <div className="max-w-2xl">
            <SearchBar />
          </div>
          <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-8 text-center text-sm text-muted">
            영화 상세 페이지에서 “비교에 추가” 버튼으로 담거나, 주소에{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
              /compare?a=영화id&b=영화id
            </code>{" "}
            형태로 두 작품을 지정할 수 있어요.
          </p>
        </div>
      ) : (
        <CompareTable A={A} B={B} />
      )}
    </div>
  );
}

function CompareTable({
  A,
  B,
}: {
  A: { detail: MovieDetail; providers: WatchProviders };
  B: { detail: MovieDetail; providers: WatchProviders };
}) {
  const cols = [A, B];
  const ottNames = (p: WatchProviders) =>
    [...p.flatrate, ...p.rent, ...p.buy].map((x) => x.name);
  const rows: { label: string; render: (c: typeof A) => React.ReactNode }[] = [
    { label: "감독", render: (c) => c.detail.director ?? "—" },
    { label: "개봉", render: (c) => c.detail.year ?? "—" },
    { label: "TMDb 평점", render: (c) => (c.detail.tmdbRating ? `★ ${c.detail.tmdbRating}` : "—") },
    { label: "러닝타임", render: (c) => (c.detail.runtime ? `${c.detail.runtime}분` : "—") },
    { label: "국가", render: (c) => c.detail.country ?? "—" },
    { label: "장르", render: (c) => c.detail.genres.join(", ") || "—" },
    {
      label: "시청처",
      render: (c) => {
        const n = ottNames(c.providers);
        return n.length ? n.slice(0, 5).join(", ") : "정보 없음";
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {/* 포스터 헤더 */}
      {cols.map((c) => (
        <Link
          key={c.detail.tmdbId}
          href={`/movies/${c.detail.tmdbId}`}
          className="group block"
        >
          <div className="aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10">
            {c.detail.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.detail.posterUrl} alt={c.detail.title} className="h-full w-full object-cover" />
            )}
          </div>
          <h2 className="headline mt-3 text-lg text-bone group-hover:text-accent-soft">
            {c.detail.title}
          </h2>
        </Link>
      ))}

      {/* 비교 행들 */}
      {rows.map((r) => (
        <div key={r.label} className="col-span-2 grid grid-cols-2 gap-4 border-t border-bone/10 pt-3 sm:gap-6">
          <div className="col-span-2 -mb-1 text-xs uppercase tracking-wider text-faint">
            {r.label}
          </div>
          {cols.map((c) => (
            <div key={c.detail.tmdbId} className="text-sm text-bone">
              {r.render(c)}
            </div>
          ))}
        </div>
      ))}

      <div className="col-span-2 pt-4 text-center">
        <Link href="/compare" className="link-underline text-sm text-muted">
          다른 영화 비교하기
        </Link>
      </div>
    </div>
  );
}
