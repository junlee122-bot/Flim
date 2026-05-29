import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { getCurations } from "@/lib/data";
import { getRecommendation } from "@/lib/recommend";
import { getDailyBoxOffice, koficConfigured } from "@/lib/kofic";
import { tmdbConfigured } from "@/lib/tmdb";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  editor: "에디터 추천",
  "auto-db": "평점·수상 기반 자동 추천",
  "auto-tmdb": "평점 기반 자동 추천",
};

export default async function HomePage() {
  const [pick, curations, boxOffice] = await Promise.all([
    getRecommendation(),
    getCurations(),
    getDailyBoxOffice(),
  ]);
  const needsSetup = !tmdbConfigured() || !isSupabaseConfigured();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6">
        <p className="kicker">CINEPHILE ARCHIVE</p>
        <h1 className="headline max-w-3xl text-4xl leading-tight sm:text-5xl">
          한 편의 영화를, 정보와 평점과 평론으로
          <br />
          한 화면에 정리하다.
        </h1>
        <p className="max-w-xl text-muted">
          단순한 검색이 아니라 큐레이션과 비평의 아카이브. 포스터·수상·평론가의
          한줄평까지.
        </p>
        <div className="max-w-2xl pt-2">
          <SearchBar />
        </div>
      </section>

      {needsSetup && <SetupNotice />}

      {/* 오늘의 추천 영화 */}
      <section>
        <SectionTitle
          kicker="TODAY'S PICK"
          title="오늘의 추천 영화"
          href={null}
        />
        {pick ? (
          <Link
            href={`/movies/${pick.tmdbId}`}
            className="group mt-4 grid gap-6 rounded-sm border border-bone/10 bg-ink-900 p-6 sm:grid-cols-[160px_1fr]"
          >
            <div className="aspect-[2/3] overflow-hidden rounded-sm bg-ink-800">
              {pick.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pick.posterUrl}
                  alt={pick.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="space-y-3">
              <span className="inline-block rounded-sm border border-accent/40 px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-accent">
                {SOURCE_LABEL[pick.source] ?? "추천"}
              </span>
              <h3 className="headline text-2xl">
                {pick.title}
                {pick.year ? (
                  <span className="text-muted"> ({pick.year})</span>
                ) : null}
              </h3>
              {pick.director && (
                <p className="text-sm text-muted">감독 · {pick.director}</p>
              )}
              <p className="text-sm text-accent/90">{pick.reason}</p>
              <p className="line-clamp-3 text-sm text-bone/80">
                {pick.overview}
              </p>
            </div>
          </Link>
        ) : (
          <EmptyState text="아직 추천할 작품이 없습니다. TMDb 키를 설정하거나 관리자 페이지에서 영화를 추가하세요." />
        )}
      </section>

      {/* KOFIC 박스오피스 */}
      {koficConfigured() && boxOffice.length > 0 && (
        <section>
          <SectionTitle
            kicker="KOREAN BOX OFFICE · KOFIC"
            title="박스오피스"
            href={null}
          />
          <ol className="mt-4 divide-y divide-bone/10">
            {boxOffice.map((b) => (
              <li key={b.rank}>
                <Link
                  href={`/search?q=${encodeURIComponent(b.movieNm)}`}
                  className="flex items-baseline gap-4 py-3 hover:bg-ink-900"
                >
                  <span className="headline w-8 shrink-0 text-xl text-accent">
                    {b.rank}
                  </span>
                  <span className="flex-1 truncate">{b.movieNm}</span>
                  <span className="shrink-0 text-xs text-muted">
                    누적 {Number(b.audiAcc).toLocaleString()}명
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 큐레이션 */}
      <section id="curations">
        <SectionTitle kicker="CURATIONS" title="씨네필 큐레이션" href={null} />
        {curations.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {curations.map((c) => (
              <Link
                key={c.id}
                href={`/curations/${c.slug}`}
                className="group rounded-sm border border-bone/10 bg-ink-900 p-5 transition hover:border-accent/40"
              >
                <h3 className="headline text-xl group-hover:text-accent">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {c.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="큐레이션 리스트가 아직 없습니다. (예: 입문 고전 / 칸 수상작 / 이동진 추천작 / 90년대 홍콩영화 / A24)" />
        )}
      </section>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  href,
}: {
  kicker: string;
  title: string;
  href: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-bone/10 pb-3">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="headline mt-1 text-2xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm text-muted hover:text-bone">
          전체 보기 →
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-sm border border-dashed border-bone/15 p-6 text-sm text-muted">
      {text}
    </p>
  );
}

function SetupNotice() {
  return (
    <section className="rounded-sm border border-accent/30 bg-accent/5 p-5 text-sm">
      <p className="font-medium text-accent">설정 필요</p>
      <p className="mt-2 text-bone/80">
        <code>.env.local</code> 에 TMDb / Supabase 키를 채우면 실제 데이터가
        표시됩니다. <code>.env.local.example</code> 와{" "}
        <code>supabase/schema.sql</code> 를 참고하세요. TMDb 가 설정되면 검색·상세
        페이지가, Supabase 가 설정되면 추천·큐레이션·평론이 동작합니다.
      </p>
    </section>
  );
}
