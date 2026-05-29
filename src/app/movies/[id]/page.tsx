import { notFound } from "next/navigation";
import { getMovieDetail, tmdbConfigured } from "@/lib/tmdb";
import { getExternalRatings } from "@/lib/omdb";
import {
  getKoficMovieInfo,
  isLikelyKoreanFilm,
  koficConfigured,
} from "@/lib/kofic";
import { ensureMovieRow, getApprovedReviews, getAwards } from "@/lib/data";
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
        <p className="rounded-sm border border-accent/30 bg-accent/5 p-4 text-sm">
          TMDb API 키가 없어 상세 정보를 불러올 수 없습니다.
        </p>
      );
    }
    notFound();
  }

  // 로컬 movie 행 보장(평론/수상 연결) → 없으면 DB 미설정 상태
  const row = await ensureMovieRow(tmdbId, detail);
  const isKorean = isLikelyKoreanFilm(detail.country, detail.originalTitle);
  const [external, awards, reviews, kofic] = await Promise.all([
    getExternalRatings(detail.imdbId),
    row ? getAwards(row.id) : Promise.resolve<Award[]>([]),
    row ? getApprovedReviews(row.id) : Promise.resolve<CriticReview[]>([]),
    isKorean && koficConfigured()
      ? getKoficMovieInfo(detail.originalTitle || detail.title, detail.year)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero / backdrop */}
      <section className="relative">
        {detail.backdropUrl && (
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-sm opacity-25">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.backdropUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
          </div>
        )}
        <div className="grid gap-8 py-6 sm:grid-cols-[220px_1fr]">
          <div className="aspect-[2/3] overflow-hidden rounded-sm bg-ink-800 ring-1 ring-bone/10">
            {detail.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.posterUrl}
                alt={detail.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h1 className="headline text-4xl leading-tight">
                {detail.title}
                {detail.year ? (
                  <span className="text-muted"> ({detail.year})</span>
                ) : null}
              </h1>
              {detail.originalTitle !== detail.title && (
                <p className="mt-1 italic text-muted">{detail.originalTitle}</p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:max-w-lg">
              <Info label="감독" value={detail.director} />
              <Info label="국가" value={detail.country} />
              <Info label="장르" value={detail.genres.join(", ") || null} />
              <Info
                label="러닝타임"
                value={detail.runtime ? `${detail.runtime}분` : null}
              />
              <Info
                label="출연"
                value={detail.cast.slice(0, 4).join(", ") || null}
              />
              {kofic?.openDt && <Info label="국내개봉" value={kofic.openDt} />}
            </dl>

            {/* 평점 */}
            <div className="flex flex-wrap gap-3 pt-2">
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
      </section>

      {/* 줄거리 */}
      {detail.overview && (
        <Section title="줄거리" kicker="SYNOPSIS">
          <p className="max-w-3xl leading-relaxed text-bone/85">
            {detail.overview}
          </p>
        </Section>
      )}

      {/* KOFIC 한국영화 보강 */}
      {kofic && (
        <Section title="국내 정보 (KOFIC)" kicker="KOREAN FILM DATA">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:max-w-lg">
            <Info label="개봉일" value={kofic.openDt} />
            <Info
              label="상영시간"
              value={kofic.showTm ? `${kofic.showTm}분` : null}
            />
            <Info label="관람등급" value={kofic.watchGradeNm} />
            <Info label="제작상태" value={kofic.prdtStatNm} />
            <Info label="국적" value={kofic.nations.join(", ") || null} />
            <Info label="장르" value={kofic.genres.join(", ") || null} />
            <Info label="배급/제작" value={kofic.companyNm} />
          </dl>
        </Section>
      )}

      {/* 스틸컷 */}
      {detail.stills.length > 0 && (
        <Section title="스틸컷" kicker="STILLS">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.stills.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s}
                src={s}
                alt=""
                className="aspect-video w-full rounded-sm object-cover ring-1 ring-bone/10"
                loading="lazy"
              />
            ))}
          </div>
        </Section>
      )}

      {/* 수상 경력 */}
      <Section title="수상 경력" kicker="AWARDS">
        {awards.length > 0 ? (
          <ul className="space-y-2">
            {awards.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-bone/10 pb-2 text-sm"
              >
                <span className="font-medium text-accent">{a.festival}</span>
                {a.category && <span>{a.category}</span>}
                {a.year && <span className="text-muted">{a.year}</span>}
                <span className="text-muted">
                  · {a.result === "won" ? "수상" : "후보"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            등록된 수상 정보가 없습니다. (관리자 페이지에서 오스카·칸·베니스·베를린
            등 수상 정보를 추가할 수 있습니다)
          </p>
        )}
      </Section>

      {/* 평론가 코멘트 */}
      <Section title="평론가 코멘트" kicker="CRITICS">
        {reviews.length > 0 ? (
          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="border-l-2 border-accent/40 pl-4">
                <div className="flex flex-wrap items-center gap-x-3 text-sm">
                  <span className="font-medium">{r.critic_name}</span>
                  {r.source_name && (
                    <span className="text-muted">· {r.source_name}</span>
                  )}
                  <StarRating value={r.rating} />
                </div>
                {r.short_quote && (
                  <p className="mt-1 headline text-lg">“{r.short_quote}”</p>
                )}
                {r.summary && (
                  <p className="mt-1 text-sm text-bone/75">{r.summary}</p>
                )}
                {r.source_url && (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-accent hover:underline"
                  >
                    원문 보기 →
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            아직 등록된 평론가 코멘트가 없습니다. 저작권·이용약관 준수를 위해
            짧은 인용/요약 + 원문 링크 형태로만 제공합니다.
          </p>
        )}

        {/* 자동 검색 (검토 대기로 저장 → 관리자 승인 후 공개) */}
        <div className="mt-6">
          <CriticAutoSearch tmdbId={tmdbId} title={detail.title} />
        </div>
      </Section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-bone">{value ?? "—"}</dd>
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
  return (
    <div className="rounded-sm border border-bone/15 px-3 py-2 text-center">
      <p className="kicker">{label}</p>
      <p className="mt-1 text-sm">
        {value ?? <span className="text-muted">{pendingNote ?? "—"}</span>}
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
    <section>
      <div className="mb-4 border-b border-bone/10 pb-2">
        <p className="kicker">{kicker}</p>
        <h2 className="headline mt-1 text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
