// =============================================================
// 정적 데이터 스토어 — Supabase 대신 빌드에 포함된 JSON을 읽는다.
// src/data/*.json 은 scripts/export-db.mjs 로 내보낸 스냅샷.
// 모든 조회는 메모리 인덱스로 동기 수행한다.
// =============================================================
import type {
  Award,
  CriticReview,
  Curation,
  MovieRow,
  SeriesRow,
} from "@/types";

import moviesJson from "@/data/movies.json";
import seriesJson from "@/data/series.json";
import curationsJson from "@/data/curations.json";
import curationMoviesJson from "@/data/curation_movies.json";
import awardsJson from "@/data/awards.json";
import reviewsJson from "@/data/critic_reviews.json";
import dailyPicksJson from "@/data/daily_picks.json";

// 내부 확장 타입 — JSON 에는 정렬용 컬럼(가중평점·투표수·인기도)이 더 있다.
export type MovieFull = MovieRow & {
  vote_count: number;
  popularity: number;
  weighted_rating: number | null;
};
export type SeriesFull = SeriesRow & {
  vote_count: number;
  popularity: number;
  weighted_rating: number | null;
};
type CurationMovieLink = {
  curation_id: string;
  movie_id: string;
  position: number | null;
  note: string | null;
};
type AwardRow = Award & { movie_id: string };
type DailyPick = {
  movie_id: string;
  pick_date: string;
  reason: string | null;
};

// ── 원본 배열 ──────────────────────────────────────────
export const movies = moviesJson as unknown as MovieFull[];
export const series = seriesJson as unknown as SeriesFull[];
export const curations = curationsJson as unknown as Curation[];
const curationMovies = curationMoviesJson as unknown as CurationMovieLink[];
const awards = awardsJson as unknown as AwardRow[];
const reviews = reviewsJson as unknown as CriticReview[];
const dailyPicks = dailyPicksJson as unknown as DailyPick[];

// ── 인덱스 ────────────────────────────────────────────
export const movieByTmdb = new Map<number, MovieFull>();
export const movieById = new Map<string, MovieFull>();
for (const m of movies) {
  movieByTmdb.set(m.tmdb_id, m);
  movieById.set(m.id, m);
}

export const curationById = new Map<string, Curation>();
export const curationBySlug = new Map<string, Curation>();
for (const c of curations) {
  curationById.set(c.id, c);
  curationBySlug.set(c.slug, c);
}

// 큐레이션 → 링크들 (position 정렬), 영화 → 속한 큐레이션 id 들
export const linksByCuration = new Map<string, CurationMovieLink[]>();
export const curationIdsByMovie = new Map<string, string[]>();
for (const l of curationMovies) {
  (linksByCuration.get(l.curation_id) ?? linksByCuration.set(l.curation_id, []).get(l.curation_id)!).push(l);
  (curationIdsByMovie.get(l.movie_id) ?? curationIdsByMovie.set(l.movie_id, []).get(l.movie_id)!).push(l.curation_id);
}
for (const arr of linksByCuration.values()) {
  arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

// 영화 → 수상 내역
export const awardsByMovie = new Map<string, AwardRow[]>();
for (const a of awards) {
  (awardsByMovie.get(a.movie_id) ?? awardsByMovie.set(a.movie_id, []).get(a.movie_id)!).push(a);
}
export const allAwards = awards;

// 영화 → 승인된 평론
export const approvedReviewsByMovie = new Map<string, CriticReview[]>();
export const approvedReviews = reviews.filter((r) => r.status === "approved");
for (const r of approvedReviews) {
  (approvedReviewsByMovie.get(r.movie_id) ?? approvedReviewsByMovie.set(r.movie_id, []).get(r.movie_id)!).push(r);
}

export const dailyPicksList = dailyPicks;
