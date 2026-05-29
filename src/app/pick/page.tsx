import Link from "next/link";
import { pickMovies, type PickFilter } from "@/lib/data";
import { getApprovedReviews } from "@/lib/data";
import { MOODS, moodGenres } from "@/lib/moods";
import PickShare from "@/components/PickShare";
import WatchedToggle from "@/components/WatchedToggle";
import type { CriticReview } from "@/types";

export const dynamic = "force-dynamic";

const GENRES = [
  "액션","드라마","코미디","스릴러","로맨스","SF","공포","애니메이션",
  "범죄","판타지","미스터리","모험","전쟁","음악","역사","다큐멘터리",
];
const DECADES = [
  { key: "2020s", label: "2020년대" },
  { key: "2010s", label: "2010년대" },
  { key: "2000s", label: "2000년대" },
  { key: "1990s", label: "1990년대" },
  { key: "1980s", label: "1980년대" },
  { key: "older", label: "그 이전" },
];
const RUNTIMES = [
  { key: "90", label: "90분 이내" },
  { key: "120", label: "2시간 이내" },
  { key: "180", label: "3시간 이내" },
];
const RATINGS = [
  { key: "7", label: "7점+" },
  { key: "8", label: "8점+" },
];

export default async function PickPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const selectedGenres = (sp.g ?? "").split(",").filter(Boolean);
  const mood = sp.mood ?? "";
  const decade = sp.decade ?? "";
  const maxRuntime = sp.runtime ? Number(sp.runtime) : undefined;
  const minRating = sp.rating ? Number(sp.rating) : undefined;
  const seed = sp.seed ? Number(sp.seed) : 1;
  const submitted = "go" in sp;
  // 본 영화 제외 목록 (클라이언트가 ?seen= 으로 동기화)
  const seen = (sp.seen ?? "")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  // 현재 상태를 유지하며 파라미터 토글하는 URL 빌더
  const build = (patch: Record<string, string | undefined>) => {
    const cur: Record<string, string | undefined> = {
      g: selectedGenres.join(",") || undefined,
      mood: mood || undefined,
      decade: decade || undefined,
      runtime: sp.runtime,
      rating: sp.rating,
      go: submitted ? "1" : undefined,
      seed: sp.seed,
      seen: sp.seen,
      ...patch,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/pick?${s}` : "/pick";
  };

  const toggleGenre = (g: string) => {
    const next = selectedGenres.includes(g)
      ? selectedGenres.filter((x) => x !== g)
      : [...selectedGenres, g];
    return build({ g: next.join(",") || undefined });
  };

  let picks: Awaited<ReturnType<typeof pickMovies>> = [];
  const reviewsByMovie: Record<string, CriticReview[]> = {};
  if (submitted) {
    // 분위기 → 장르로 환산해 선택 장르와 합집합
    const effGenres = Array.from(
      new Set([...selectedGenres, ...moodGenres(mood)]),
    );
    const filter: PickFilter = {
      genres: effGenres,
      decade,
      maxRuntime,
      minRating,
      seed,
      excludeTmdbIds: seen,
    };
    picks = await pickMovies(filter, 3);
    // 각 추천작의 대표 평론 1개 (있으면)
    const lists = await Promise.all(picks.map((m) => getApprovedReviews(m.id)));
    picks.forEach((m, i) => {
      if (lists[i].length) reviewsByMovie[m.id] = lists[i];
    });
  }

  return (
    <div className="space-y-10">
      <header className="animate-fade-up">
        <p className="kicker">Mood Picker</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          오늘, 뭐 볼까?
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          취향을 골라주세요. 조건에 맞는 작품을 골라 드립니다. 마음에 안 들면
          다시 뽑을 수 있어요.
        </p>
      </header>

      {/* 취향 선택 */}
      <div className="space-y-6 rounded-md border border-bone/10 bg-ink-900/50 p-6">
        <FilterGroup label="분위기">
          {MOODS.map((m) => (
            <Chip
              key={m.key}
              href={build({ mood: mood === m.key ? undefined : m.key })}
              active={mood === m.key}
            >
              {m.emoji} {m.label}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="장르 (복수 선택)">
          {GENRES.map((g) => (
            <Chip key={g} href={toggleGenre(g)} active={selectedGenres.includes(g)}>
              {g}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="시대">
          {DECADES.map((d) => (
            <Chip
              key={d.key}
              href={build({ decade: decade === d.key ? undefined : d.key })}
              active={decade === d.key}
            >
              {d.label}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="러닝타임">
          {RUNTIMES.map((r) => (
            <Chip
              key={r.key}
              href={build({ runtime: sp.runtime === r.key ? undefined : r.key })}
              active={sp.runtime === r.key}
            >
              {r.label}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="평점">
          {RATINGS.map((r) => (
            <Chip
              key={r.key}
              href={build({ rating: sp.rating === r.key ? undefined : r.key })}
              active={sp.rating === r.key}
            >
              {r.label}
            </Chip>
          ))}
        </FilterGroup>

        <div className="flex flex-wrap items-center gap-3 border-t border-bone/10 pt-5">
          <Link href={build({ go: "1", seed: "1" })} className="btn btn-accent">
            영화 골라줘
          </Link>
          {submitted && (
            <Link
              href={build({ go: "1", seed: String(seed + 1) })}
              className="btn btn-ghost"
            >
              다시 뽑기 ↻
            </Link>
          )}
          {submitted && <PickShare />}
          <Link href="/pick" className="link-underline text-sm text-faint">
            초기화
          </Link>
        </div>
      </div>

      {/* 결과 */}
      {submitted &&
        (picks.length > 0 ? (
          <section className="animate-fade-up">
            <div className="mb-5 flex items-end justify-between border-b border-bone/10 pb-3">
              <div>
                <p className="kicker">Today&apos;s Picks</p>
                <h2 className="headline mt-2 text-2xl">
                  당신을 위한 {picks.length}편
                </h2>
              </div>
            </div>
            <div className="space-y-6">
              {picks.map((m) => {
                const rv = reviewsByMovie[m.id]?.[0];
                return (
                  <div
                    key={m.tmdb_id}
                    className="card grid gap-5 p-5 sm:grid-cols-[120px_1fr]"
                  >
                    <Link href={`/movies/${m.tmdb_id}`} className="block">
                      <div className="aspect-[2/3] w-full overflow-hidden rounded-sm bg-ink-800 ring-1 ring-bone/10">
                        {m.poster_path && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.poster_path}
                            alt={m.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-col justify-center gap-2">
                      <Link href={`/movies/${m.tmdb_id}`}>
                        <h3 className="headline text-2xl leading-tight hover:text-accent-soft">
                          {m.title}
                          {m.release_year ? (
                            <span className="font-light text-muted">
                              {" "}
                              ({m.release_year})
                            </span>
                          ) : null}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        {m.director && <span>{m.director}</span>}
                        {m.runtime ? <span>· {m.runtime}분</span> : null}
                        {m.tmdb_rating ? (
                          <span className="text-accent">★ {m.tmdb_rating}</span>
                        ) : null}
                      </div>
                      {m.genres && m.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.genres.slice(0, 4).map((g) => (
                            <span key={g} className="chip py-0.5 text-[0.7rem]">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                      {rv ? (
                        <p className="mt-1 border-l-2 border-accent/40 pl-3 text-sm italic text-bone/80">
                          “{rv.short_quote}”
                          <span className="ml-2 not-italic text-xs text-muted">
                            — {rv.critic_name}
                          </span>
                        </p>
                      ) : m.overview ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-bone/70">
                          {m.overview}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <WatchedToggle tmdbId={m.tmdb_id} title={m.title} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
            <p className="headline text-xl text-muted">조건에 맞는 작품이 없어요</p>
            <p className="mt-2 text-sm text-faint">
              필터를 조금 줄이거나 다른 조합으로 다시 시도해 보세요.
            </p>
          </div>
        ))}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-xs uppercase tracking-wider text-faint">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
      }`}
    >
      {children}
    </Link>
  );
}
