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

  return (
    <div className="space-y-20">
      {/* ── Hero ───────────────────────────── */}
      <section className="animate-fade-up">
        <p className="kicker">Cinephile Archive</p>
        <h1 className="headline mt-5 max-w-4xl text-balance text-4xl leading-[1.1] sm:text-6xl">
          한 편의 영화를,
          <br />
          <span className="italic text-accent-soft">정보와 평점과 평론</span>으로
          <br />한 화면에 정리하다.
        </h1>
        <p className="mt-6 max-w-xl text-pretty leading-relaxed text-muted">
          단순한 검색이 아니라 큐레이션과 비평의 아카이브. 포스터부터 수상 이력,
          평론가의 한줄평까지 — 한 작품의 모든 맥락을 모읍니다.
        </p>
        <div className="mt-8 max-w-2xl">
          <SearchBar />
        </div>
      </section>

      {needsSetup && <SetupNotice />}

      {/* ── 오늘의 추천 영화 ───────────────────────────── */}
      <section className="animate-fade-up">
        <SectionHeader kicker="Today's Pick" title="오늘의 추천 영화" />
        {pick ? (
          <Link
            href={`/movies/${pick.tmdbId}`}
            className="card card-hover group grid overflow-hidden sm:grid-cols-[200px_1fr]"
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-ink-800 sm:aspect-auto">
              {pick.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pick.posterUrl}
                  alt={pick.title}
                  className="h-full w-full object-cover transition duration-[700ms] ease-smooth group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full min-h-[260px] items-center justify-center text-muted">
                  포스터 없음
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
              <span className="badge w-fit">{SOURCE_LABEL[pick.source] ?? "추천"}</span>
              <h3 className="headline text-3xl leading-tight">
                {pick.title}
                {pick.year ? (
                  <span className="text-muted"> ({pick.year})</span>
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
              <span className="link-underline mt-1 w-fit text-sm text-muted">
                상세 보기 →
              </span>
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
