import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SectionHeader from "@/components/SectionHeader";
import CurationCard from "@/components/CurationCard";
import { getCurationsWithPosters } from "@/lib/data";
import { getRecommendation } from "@/lib/recommend";
import { getDailyBoxOffice, koficConfigured } from "@/lib/kofic";
import { tmdbConfigured } from "@/lib/tmdb";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { groupCurations } from "@/lib/categories";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  editor: "에디터 추천",
  "auto-db": "평점·수상 기반 추천",
  "auto-tmdb": "평점 기반 추천",
};

export default async function HomePage() {
  const [pick, curations, boxOffice] = await Promise.all([
    getRecommendation(),
    getCurationsWithPosters(),
    getDailyBoxOffice(),
  ]);
  const needsSetup = !tmdbConfigured() || !isSupabaseConfigured();
  const grouped = groupCurations(curations);

  // 히어로 배경용 포스터 (큐레이션에서 모아 중복 제거)
  const heroPosters = Array.from(
    new Set(curations.flatMap((c) => c.posters)),
  ).slice(0, 18);

  return (
    <div className="space-y-20">
      {/* ── Hero ───────────────────────────── */}
      <section className="relative -mx-5 -mt-12 overflow-hidden px-5 pb-4 pt-20 sm:-mx-8 sm:px-8 sm:pt-28">
        {/* 포스터 월 배경 — 우측에 비대칭 배치, 좌측 텍스트는 보호 */}
        {heroPosters.length >= 6 && (
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute inset-y-0 right-0 hidden w-[62%] grid-cols-5 gap-1.5 opacity-50 lg:grid">
              {heroPosters.slice(0, 15).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt=""
                  className="aspect-[2/3] h-full w-full rounded-sm object-cover"
                  loading="eager"
                />
              ))}
            </div>
            {/* 모바일/태블릿: 전폭 은은한 월 */}
            <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-25 lg:hidden">
              {heroPosters.slice(0, 12).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt=""
                  className="aspect-[2/3] h-full w-full object-cover"
                  loading="eager"
                />
              ))}
            </div>
            {/* 좌→우 페이드: 텍스트 영역 보호 */}
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
          </div>
        )}

        <p className="kicker">씨네필의 영화 서재</p>
        <h1 className="headline mt-5 max-w-4xl text-balance text-4xl leading-[1.12] sm:text-6xl">
          오늘 볼 영화,
          <br />
          <span className="italic text-accent-soft">평론과 함께</span> 고르다.
        </h1>
        <p className="mt-6 max-w-xl text-pretty leading-relaxed text-bone/70">
          정보·평점·수상·평론을 한 화면에. 취향으로 오늘의 한 편을 고르고,
          평론가의 별점과 한줄평으로 음미하세요.
        </p>
        <div className="mt-8 max-w-2xl">
          <SearchBar />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/pick" className="btn btn-accent px-4 py-2 text-sm">
            오늘 뭐 볼까?
          </Link>
          <Link href="/now" className="link-underline text-muted">
            최신·추천작 →
          </Link>
          <Link href="/awards" className="link-underline text-muted">
            수상작 →
          </Link>
          <a href="/random" className="link-underline text-muted">
            🎲 랜덤
          </a>
          <span className="text-xs text-faint">
            영화 {curations.length}개 컬렉션 · TMDb 전체 검색
          </span>
        </div>
      </section>

      {needsSetup && <SetupNotice />}

      {/* ── 오늘의 추천 영화 ───────────────────────────── */}
      <section className="animate-fade-up">
        <SectionHeader kicker="Today's Pick" title="오늘의 추천 영화" />
        {pick ? (
          <Link
            href={`/movies/${pick.tmdbId}`}
            className="group relative block overflow-hidden rounded-md border border-bone/10 ring-1 ring-transparent transition duration-300 ease-smooth hover:ring-accent/30"
          >
            {/* 시네마틱 백드롭 */}
            {pick.backdropUrl && (
              <div className="absolute inset-0 -z-10" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pick.backdropUrl}
                  alt=""
                  className="h-full w-full object-cover object-top opacity-50 transition duration-[900ms] ease-smooth group-hover:scale-[1.03] group-hover:opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
              </div>
            )}
            <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr] sm:p-8">
              <div className="aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-sm bg-ink-800 shadow-2xl shadow-black/50 ring-1 ring-bone/10">
                {pick.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pick.posterUrl}
                    alt={pick.title}
                    className="h-full w-full object-cover transition duration-[700ms] ease-smooth group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    포스터 없음
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-4">
                <span className="badge w-fit">
                  {SOURCE_LABEL[pick.source] ?? "추천"}
                </span>
                <h3 className="headline text-3xl leading-tight sm:text-4xl">
                  {pick.title}
                  {pick.year ? (
                    <span className="font-light text-muted"> ({pick.year})</span>
                  ) : null}
                </h3>
                {pick.director && (
                  <p className="text-sm text-muted">
                    감독 <span className="text-bone">{pick.director}</span>
                  </p>
                )}
                <p className="border-l-2 border-accent/50 pl-3 text-sm italic text-accent-soft">
                  {pick.reason}
                </p>
                {pick.overview && (
                  <p className="line-clamp-3 max-w-prose text-pretty leading-relaxed text-bone/75">
                    {pick.overview}
                  </p>
                )}
                <span className="link-underline mt-1 w-fit text-sm text-bone/80">
                  상세 보기 →
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <EmptyState text="아직 추천할 작품이 없습니다. TMDb 키를 설정하거나 관리자 페이지에서 영화를 추가하세요." />
        )}
      </section>

      {/* ── KOFIC 박스오피스 ───────────────────────────── */}
      {koficConfigured() && boxOffice.length > 0 && (
        <section className="animate-fade-up">
          <SectionHeader kicker="Korean Box Office · KOFIC" title="박스오피스" />
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {boxOffice.map((b) => (
              <li key={b.rank}>
                <Link
                  href={`/search?q=${encodeURIComponent(b.movieNm)}`}
                  className="group flex items-center gap-4 border-b border-bone/10 py-4 transition-colors hover:border-accent/30"
                >
                  <span className="headline w-8 shrink-0 text-2xl text-accent/80 transition-colors group-hover:text-accent">
                    {b.rank}
                  </span>
                  <span className="flex-1 truncate text-bone transition-colors group-hover:text-accent-soft">
                    {b.movieNm}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    누적 {Number(b.audiAcc).toLocaleString()}명
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 큐레이션 (카테고리별 미리보기) ───────────────────── */}
      <section id="curations" className="scroll-mt-24 animate-fade-up">
        <SectionHeader
          kicker="Curations"
          title="씨네필 큐레이션"
          href="/curations"
          hrefLabel={`전체 ${curations.length}개 보기`}
        />
        {grouped.length > 0 ? (
          <div className="space-y-12">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="mb-4 flex items-baseline justify-between">
                  <h3 className="headline text-lg text-bone">
                    <span className="kicker mr-3 align-middle">{g.kicker}</span>
                    {g.label}
                    <span className="ml-2 text-sm text-faint">
                      {g.items.length}
                    </span>
                  </h3>
                  <Link
                    href={`/curations?cat=${g.key}`}
                    className="link-underline shrink-0 text-xs text-muted"
                  >
                    더 보기 →
                  </Link>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.slice(0, 3).map((c) => (
                    <CurationCard key={c.id} curation={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="큐레이션 리스트가 아직 없습니다. 예: 입문 고전 · 칸 수상작 · 이동진 추천작 · 90년대 홍콩영화 · A24" />
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-8 text-center text-sm leading-relaxed text-muted">
      {text}
    </p>
  );
}

function SetupNotice() {
  return (
    <section className="animate-fade-in rounded-md border border-accent/30 bg-accent/[0.06] p-6">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs text-accent"
          aria-hidden
        >
          !
        </span>
        <div className="text-sm">
          <p className="font-medium text-accent">설정이 필요합니다</p>
          <p className="mt-2 leading-relaxed text-bone/80">
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">.env.local</code>{" "}
            에 TMDb / Supabase 키를 채우면 실제 데이터가 표시됩니다.{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
              .env.local.example
            </code>{" "}
            와{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
              supabase/schema.sql
            </code>{" "}
            을 참고하세요. TMDb 설정 시 검색·상세가, Supabase 설정 시
            추천·큐레이션·평론이 동작합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
