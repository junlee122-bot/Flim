import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovieDetail, tmdbConfigured } from "@/lib/tmdb";
import { getExternalRatings } from "@/lib/omdb";
import {
  getKoficMovieInfo,
  isLikelyKoreanFilm,
  koficConfigured,
} from "@/lib/kofic";
import {
  ensureMovieRow,
  getApprovedReviews,
  getAwards,
  getCurationsForMovie,
} from "@/lib/data";
import StarRating from "@/components/StarRating";
import CriticAutoSearch from "@/components/CriticAutoSearch";
import type { Award, CriticReview } from "@/types";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();

  const detail = await getMovieDetail(tmdbId);
  if (!detail) {
    if (!tmdbConfigured()) {
      return (
        <p className="rounded-md border border-accent/30 bg-accent/[0.06] p-6 text-sm text-bone/80">
          TMDb API 키가 없어 상세 정보를 불러올 수 없습니다.
        </p>
      );
    }
    notFound();
  }

  // 로컬 movie 행 보장(평론/수상 연결) → 없으면 DB 미설정 상태
  const row = await ensureMovieRow(tmdbId, detail);
  const isKorean = isLikelyKoreanFilm(detail.country, detail.originalTitle);
  const [external, awards, reviews, kofic, inCurations] = await Promise.all([
    getExternalRatings(detail.imdbId),
    row ? getAwards(row.id) : Promise.resolve<Award[]>([]),
    row ? getApprovedReviews(row.id) : Promise.resolve<CriticReview[]>([]),
    isKorean && koficConfigured()
      ? getKoficMovieInfo(detail.originalTitle || detail.title, detail.year)
      : Promise.resolve(null),
    row ? getCurationsForMovie(row.id) : Promise.resolve([]),
  ]);

  return (
    <article className="space-y-16">
      {/* ── Hero ───────────────────────────── */}
      <header className="relative -mx-5 -mt-12 overflow-hidden px-5 pb-2 pt-12 sm:-mx-8 sm:px-8">
        {detail.backdropUrl && (
          <div className="pointer-events-none absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.backdropUrl}
              alt=""
              className="h-full w-full object-cover object-top opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 to-transparent" />
          </div>
        )}

        <Link href="/search" className="link-underline text-xs text-muted">
          ← 검색으로
        </Link>

        <div className="mt-6 grid gap-8 sm:grid-cols-[240px_1fr]">
          <div className="aspect-[2/3] w-full max-w-[240px] overflow-hidden rounded-md bg-ink-800 shadow-2xl shadow-black/50 ring-1 ring-bone/10">
            {detail.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.posterUrl}
                alt={detail.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="headline text-balance text-4xl leading-[1.1] sm:text-5xl">
                {detail.title}
                {detail.year ? (
                  <span className="font-light text-muted"> ({detail.year})</span>
                ) : null}
              </h1>
              {detail.originalTitle !== detail.title && (
                <p className="mt-2 text-lg italic text-muted">
                  {detail.originalTitle}
                </p>
              )}
            </div>

            {/* 장르 칩 */}
            {detail.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.genres.map((g) => (
                  <span key={g} className="chip">
                    {g}
                  </span>
                ))}
              </div>
            )}

            <dl className="grid max-w-xl grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              <Info label="감독" value={detail.director} />
              <Info label="국가" value={detail.country} />
              <Info
                label="러닝타임"
                value={detail.runtime ? `${detail.runtime}분` : null}
              />
              {kofic?.openDt && <Info label="국내개봉" value={kofic.openDt} />}
              <Info
                label="출연"
                value={detail.cast.slice(0, 4).join(", ") || null}
                wide
              />
            </dl>

            {/* 평점 */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <RatingChip
                label="TMDb"
                value={detail.tmdbRating ? `${detail.tmdbRating}` : null}
              />
              <RatingChip label="IMDb" value={external.imdb} />
              <RatingChip label="Metacritic" value={external.metacritic} />
              <RatingChip
                label="Rotten Tomatoes"
                value={external.rottenTomatoes}
                pendingNote="추후 연동 예정"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── 줄거리 ───────────────────────────── */}
      {detail.overview && (
        <Section title="줄거리" kicker="Synopsis">
          <p className="max-w-prose text-pretty text-lg leading-relaxed text-bone/85">
            {detail.overview}
          </p>
        </Section>
      )}

      {/* ── KOFIC 한국영화 보강 ───────────────────────────── */}
      {kofic && (
        <Section title="국내 정보" kicker="Korean Film Data · KOFIC">
          <dl className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="개봉일" value={kofic.openDt} />
            <Info
              label="상영시간"
              value={kofic.showTm ? `${kofic.showTm}분` : null}
            />
            <Info label="관람등급" value={kofic.watchGradeNm} />
            <Info label="제작상태" value={kofic.prdtStatNm} />
            <Info label="국적" value={kofic.nations.join(", ") || null} />
            <Info label="장르" value={kofic.genres.join(", ") || null} />
            <Info label="배급/제작" value={kofic.companyNm} wide />
          </dl>
        </Section>
      )}

      {/* ── 예고편 ───────────────────────────── */}
      {detail.trailerKey && (
        <Section title="예고편" kicker="Trailer">
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-md ring-1 ring-bone/10">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${detail.trailerKey}`}
              title={`${detail.title} 예고편`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="h-full w-full"
            />
          </div>
        </Section>
      )}

      {/* ── 출연진 ───────────────────────────── */}
      {detail.castDetailed.length > 0 && (
        <Section title="출연진" kicker="Cast">
          <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
            {detail.castDetailed.map((c) => (
              <li key={`${c.name}-${c.character ?? ""}`} className="text-center">
                <div className="mx-auto aspect-square w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-bone/10">
                  {c.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profileUrl}
                      alt={c.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl text-faint">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm text-bone">{c.name}</p>
                {c.character && (
                  <p className="truncate text-xs text-muted">{c.character}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── 스틸컷 ───────────────────────────── */}
      {detail.stills.length > 0 && (
        <Section title="스틸컷" kicker="Stills">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.stills.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s}
                src={s}
                alt=""
                className="aspect-video w-full rounded-md object-cover ring-1 ring-bone/10 transition duration-500 ease-smooth hover:ring-accent/30"
                loading="lazy"
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── 수상 경력 ───────────────────────────── */}
      <Section title="수상 경력" kicker="Awards">
        {awards.length > 0 ? (
          <ul className="space-y-0">
            {awards.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-bone/10 py-3 text-sm"
              >
                <span className="headline text-base text-accent">
                  {a.festival}
                </span>
                {a.category && <span className="text-bone">{a.category}</span>}
                {a.year && (
                  <span className="tabular-nums text-muted">{a.year}</span>
                )}
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                    a.result === "won"
                      ? "bg-accent/15 text-accent"
                      : "bg-ink-800 text-muted"
                  }`}
                >
                  {a.result === "won" ? "수상" : "후보"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Placeholder text="등록된 수상 정보가 없습니다. 관리자 페이지에서 오스카·칸·베니스·베를린 등 수상 정보를 추가할 수 있습니다." />
        )}
      </Section>

      {/* ── 평론가 코멘트 ───────────────────────────── */}
      <Section title="평론가 코멘트" kicker="Critics">
        {reviews.length > 0 ? (
          <ul className="space-y-8">
            {reviews.map((r) => (
              <li key={r.id} className="relative pl-6">
                <span
                  className="absolute left-0 top-0 headline text-3xl leading-none text-accent/40"
                  aria-hidden
                >
                  “
                </span>
                {r.short_quote && (
                  <p className="headline text-xl leading-snug text-bone">
                    {r.short_quote}
                  </p>
                )}
                {r.summary && (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-bone/70">
                    {r.summary}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium text-bone">{r.critic_name}</span>
                  {r.source_name && (
                    <span className="text-muted">· {r.source_name}</span>
                  )}
                  <StarRating value={r.rating} />
                  {r.source_url && (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline ml-auto text-xs text-accent"
                    >
                      원문 보기 →
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Placeholder text="아직 등록된 평론가 코멘트가 없습니다. 저작권·이용약관 준수를 위해 짧은 인용/요약 + 원문 링크 형태로만 제공합니다." />
        )}

        {/* 자동 검색 (검토 대기 저장 → 관리자 승인 후 공개) */}
        <div className="mt-8">
          <CriticAutoSearch tmdbId={tmdbId} title={detail.title} />
        </div>
      </Section>

      {/* ── 이 영화가 속한 큐레이션 ───────────────────── */}
      {inCurations.length > 0 && (
        <Section title="이 영화가 속한 큐레이션" kicker="In Collections">
          <div className="flex flex-wrap gap-2.5">
            {inCurations.map((c) => (
              <Link
                key={c.slug}
                href={`/curations/${c.slug}`}
                className="rounded-full border border-bone/15 px-4 py-2 text-sm text-muted transition hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Info({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-3" : ""}>
      <dt className="text-xs uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 text-bone">{value ?? "—"}</dd>
    </div>
  );
}

function RatingChip({
  label,
  value,
  pendingNote,
}: {
  label: string;
  value: string | null;
  pendingNote?: string;
}) {
  const has = Boolean(value);
  return (
    <div
      className={`rounded-md border px-3.5 py-2 text-center ${
        has ? "border-bone/20 bg-ink-900" : "border-bone/10 bg-ink-900/40"
      }`}
    >
      <p className="text-[0.6rem] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-sm">
        {value ? (
          <span className="font-medium tabular-nums text-bone">{value}</span>
        ) : (
          <span className="text-xs text-muted">{pendingNote ?? "—"}</span>
        )}
      </p>
    </div>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up">
      <div className="mb-5 border-b border-bone/10 pb-3">
        <p className="kicker">{kicker}</p>
        <h2 className="headline mt-2 text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-6 text-sm leading-relaxed text-muted">
      {text}
    </p>
  );
}
