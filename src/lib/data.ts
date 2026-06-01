import {
  movies,
  series,
  curations as allCurations,
  curationBySlug,
  curationById,
  linksByCuration,
  curationIdsByMovie,
  movieById,
  movieByTmdb,
  awardsByMovie,
  allAwards,
  approvedReviews,
  approvedReviewsByMovie,
  dailyPicksList,
  type MovieFull,
} from "./store";
import type {
  Award,
  CriticReview,
  Curation,
  CurationWithPosters,
  MovieDetail,
  MovieRow,
  SeriesRow,
} from "@/types";

// =============================================================
// 데이터 접근 헬퍼 — 정적 JSON 스냅샷(src/data) 기반.
// 함수 시그니처는 기존 Supabase 버전과 동일(async)하게 유지한다.
// =============================================================

const byWeighted = (a: MovieFull, b: MovieFull) =>
  (b.weighted_rating ?? 0) - (a.weighted_rating ?? 0);

// 큐레이션 목록 (메인/큐레이션 페이지)
export async function getCurations(): Promise<Curation[]> {
  return allCurations
    .filter((c) => c.is_published !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// 큐레이션 목록 + 각 큐레이션의 대표 포스터(최대 4장) + 총 편수.
export async function getCurationsWithPosters(): Promise<CurationWithPosters[]> {
  return (await getCurations()).map((c) => {
    const links = linksByCuration.get(c.id) ?? [];
    const posters = links
      .map((l) => movieById.get(l.movie_id)?.poster_path)
      .filter((p): p is string => Boolean(p))
      .slice(0, 4);
    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover_image: c.cover_image,
      sort_order: c.sort_order,
      posters,
      count: links.length,
    };
  });
}

export async function getCurationBySlug(
  slug: string,
): Promise<{ curation: Curation; movies: MovieRow[] } | null> {
  const curation = curationBySlug.get(slug);
  if (!curation) return null;
  const links = linksByCuration.get(curation.id) ?? [];
  const movieRows = links
    .map((l) => movieById.get(l.movie_id))
    .filter((m): m is MovieFull => Boolean(m));
  return { curation, movies: movieRows };
}

// 오늘의 추천 영화 — 관리자 지정 > 없으면 null
export async function getDailyPick(): Promise<MovieRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const pick = dailyPicksList.find((p) => p.pick_date === today);
  if (!pick) return null;
  return movieById.get(pick.movie_id) ?? null;
}

// 이 영화(로컬 movie 행)가 속한 큐레이션 목록 (상세 페이지 탐색용)
export async function getCurationsForMovie(
  movieDbId: string,
): Promise<Pick<Curation, "slug" | "title">[]> {
  const ids = curationIdsByMovie.get(movieDbId) ?? [];
  return ids
    .map((id) => curationById.get(id))
    .filter((c): c is Curation => Boolean(c && c.is_published !== false))
    .map((c) => ({ slug: c.slug, title: c.title }));
}

// 취향 기반 "오늘 볼 영화" 후보 — 장르·연대·러닝타임·평점 필터로 추리고,
// 가중평점 상위 풀에서 셔플해 N편 반환. (탐색/재추첨용)
export type PickFilter = {
  genres?: string[]; // 한글 장르명 (OR) — 분위기 매핑 포함
  decade?: string; // 1950s..2020s
  maxRuntime?: number; // 분
  minRating?: number; // tmdb_rating
  seed?: number; // 재추첨 시드
  excludeTmdbIds?: number[]; // 본 영화 제외
};
export async function pickMovies(
  filter: PickFilter,
  count = 3,
): Promise<MovieRow[]> {
  const exclude = new Set(filter.excludeTmdbIds ?? []);
  let pool = movies.filter(
    (m) => m.vote_count >= 200 && m.poster_path && !exclude.has(m.tmdb_id),
  );

  if (filter.genres && filter.genres.length > 0) {
    const want = new Set(filter.genres);
    pool = pool.filter((m) => (m.genres ?? []).some((g) => want.has(g)));
  }
  if (filter.decade) {
    if (filter.decade === "older") {
      pool = pool.filter((m) => (m.release_year ?? 9999) <= 1959);
    } else {
      const dec = parseInt(filter.decade, 10);
      if (Number.isFinite(dec)) {
        pool = pool.filter(
          (m) =>
            (m.release_year ?? 0) >= dec && (m.release_year ?? 0) <= dec + 9,
        );
      }
    }
  }
  if (filter.maxRuntime)
    pool = pool.filter((m) => (m.runtime ?? 0) > 0 && (m.runtime ?? 0) <= filter.maxRuntime!);
  if (filter.minRating)
    pool = pool.filter((m) => (m.tmdb_rating ?? 0) >= filter.minRating!);

  const top = [...pool].sort(byWeighted).slice(0, 150);
  if (top.length === 0) return [];

  // 시드 기반 셔플 (같은 시드=같은 결과)
  let s = (filter.seed ?? 1) * 9301 + 49297;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return [...top].sort(() => rng() - 0.5).slice(0, count);
}

// 승인된 평론만 (상세 페이지 공개용)
export async function getApprovedReviews(
  movieDbId: string,
): Promise<CriticReview[]> {
  const list = approvedReviewsByMovie.get(movieDbId) ?? [];
  return [...list].sort(
    (a, b) => (b.confidence_score ?? 0) - (a.confidence_score ?? 0),
  );
}

// 평론가 한 명의 평론 전체 (영화 정보 포함) — /critics/[slug] 용
export async function getCriticReviews(criticName: string): Promise<
  { review: CriticReview; movie: MovieRow }[]
> {
  return approvedReviews
    .filter((r) => r.critic_name === criticName)
    .map((review) => ({ review, movie: movieById.get(review.movie_id) }))
    .filter((x): x is { review: CriticReview; movie: MovieFull } => Boolean(x.movie))
    .sort((a, b) => (b.review.rating ?? 0) - (a.review.rating ?? 0));
}

// 평론가별 통계 (평론 수·평균 별점) — 평론가 인덱스용
export async function getCriticStats(): Promise<
  { name: string; count: number; avg: number }[]
> {
  const map = new Map<string, { sum: number; n: number; rated: number }>();
  for (const r of approvedReviews) {
    const e = map.get(r.critic_name) ?? { sum: 0, n: 0, rated: 0 };
    e.n += 1;
    if (r.rating != null) {
      e.sum += Number(r.rating);
      e.rated += 1;
    }
    map.set(r.critic_name, e);
  }
  return [...map.entries()]
    .map(([name, e]) => ({
      name,
      count: e.n,
      avg: e.rated ? Math.round((e.sum / e.rated) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// 전체 수상작 (영화제 통합 허브용) — 영화별로 묶어 수상 내역 집계
export async function getAllAwards(): Promise<
  { movie: MovieRow; awards: { festival: string; category: string | null; year: number | null }[] }[]
> {
  const byMovie = new Map<
    string,
    { movie: MovieRow; awards: { festival: string; category: string | null; year: number | null }[] }
  >();
  for (const a of allAwards) {
    if (a.result !== "won") continue;
    const movie = movieById.get(a.movie_id);
    if (!movie) continue;
    if (!byMovie.has(a.movie_id)) byMovie.set(a.movie_id, { movie, awards: [] });
    byMovie
      .get(a.movie_id)!
      .awards.push({ festival: a.festival, category: a.category, year: a.year });
  }
  // 각 영화의 수상은 최신순
  for (const v of byMovie.values()) {
    v.awards.sort((x, y) => (y.year ?? 0) - (x.year ?? 0));
  }
  // 수상 많은 순(그랜드슬램 우선) → 최신순
  return [...byMovie.values()].sort((a, b) => {
    if (b.awards.length !== a.awards.length) return b.awards.length - a.awards.length;
    return (b.awards[0]?.year ?? 0) - (a.awards[0]?.year ?? 0);
  });
}

// 특정 영화제의 수상/후보작 — awards 를 영화 정보와 함께 묶어 반환.
export async function getFestivalWinners(keywords: string[]): Promise<
  {
    movie: MovieRow;
    category: string | null;
    year: number | null;
    result: string;
  }[]
> {
  if (keywords.length === 0) return [];
  const kws = keywords.map((k) => k.toLowerCase());
  return allAwards
    .filter((a) => kws.some((k) => a.festival.toLowerCase().includes(k)))
    .map((a) => ({
      movie: movieById.get(a.movie_id),
      category: a.category,
      year: a.year,
      result: a.result,
    }))
    .filter(
      (x): x is { movie: MovieFull; category: string | null; year: number | null; result: string } =>
        Boolean(x.movie),
    )
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

export async function getAwards(movieDbId: string): Promise<Award[]> {
  const list = awardsByMovie.get(movieDbId) ?? [];
  return [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

// tmdb_id 로 로컬 movie 행을 찾는다. (정적 스냅샷이라 신규 생성은 없음 — 없으면 null)
// detail 인자는 기존 호환을 위해 유지하되 사용하지 않는다.
export async function ensureMovieRow(
  tmdbId: number,
  _detail?: MovieDetail | null,
): Promise<MovieRow | null> {
  void _detail;
  return movieByTmdb.get(tmdbId) ?? null;
}

// 전체 카탈로그 둘러보기 — 적재된 movies 를 정렬/페이지네이션.
export type BrowseSort = "rating" | "popular" | "year" | "title";
export async function browseMovies(opts: {
  sort?: BrowseSort;
  page?: number;
  pageSize?: number;
  minRating?: number; // tmdb_rating 하한 (별점 기준 필터)
}): Promise<{ movies: MovieRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.pageSize ?? 36;
  const fromIdx = (page - 1) * size;

  let pool = movies;
  if (opts.minRating) {
    pool = pool.filter(
      (m) => (m.tmdb_rating ?? 0) >= opts.minRating! && m.vote_count >= 300,
    );
  }

  let sorted: MovieFull[];
  if (opts.sort === "year") {
    sorted = [...pool].sort(
      (a, b) => (b.release_year ?? 0) - (a.release_year ?? 0),
    );
  } else if (opts.sort === "title") {
    sorted = [...pool].sort((a, b) => a.title.localeCompare(b.title));
  } else if (opts.sort === "popular") {
    sorted = [...pool].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  } else {
    // 평점순: 베이지안 가중평점 + 최소 신뢰도 게이트(투표 100+).
    sorted = [...pool]
      .filter((m) => m.vote_count >= 100)
      .sort((a, b) => byWeighted(a, b) || b.vote_count - a.vote_count);
  }

  return {
    movies: sorted.slice(fromIdx, fromIdx + size),
    total: sorted.length,
  };
}

// ── TV 시리즈 ──────────────────────────────────────────
export async function browseSeries(opts: {
  page?: number;
  pageSize?: number;
  genre?: string;
  sort?: "rating" | "popular";
}): Promise<{ series: SeriesRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.pageSize ?? 30;
  const fromIdx = (page - 1) * size;

  let pool = series.filter((s) => s.poster_path);
  if (opts.genre) pool = pool.filter((s) => (s.genres ?? []).includes(opts.genre!));
  const sorted =
    opts.sort === "popular"
      ? [...pool].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      : [...pool].sort((a, b) => (b.weighted_rating ?? 0) - (a.weighted_rating ?? 0));

  return {
    series: sorted.slice(fromIdx, fromIdx + size),
    total: sorted.length,
  };
}

// 특정 장르(들) 영화 — 가중평점순, 페이지네이션. (애니메이션 등 장르 허브용)
export async function getMoviesByGenre(opts: {
  genres: string[]; // OR
  page?: number;
  pageSize?: number;
  minVotes?: number;
  lang?: string; // 원어 근사 (ja/ko/en) — country 로 근사
  extraGenres?: string[]; // 추가로 반드시 겹쳐야 하는 장르 (하위 장르 필터)
}): Promise<{ movies: MovieRow[]; total: number }> {
  if (opts.genres.length === 0) return { movies: [], total: 0 };
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.pageSize ?? 36;
  const fromIdx = (page - 1) * size;
  const minVotes = opts.minVotes ?? 100;
  const want = new Set(opts.genres);
  const extra = opts.extraGenres ? new Set(opts.extraGenres) : null;
  const eastAsia = new Set(["일본", "대한민국", "중국", "홍콩", "대만"]);

  const pool = movies.filter((m) => {
    if (m.vote_count < minVotes || !m.poster_path) return false;
    const g = m.genres ?? [];
    if (!g.some((x) => want.has(x))) return false;
    if (extra && !g.some((x) => extra.has(x))) return false;
    if (opts.lang === "ja" && m.country !== "일본") return false;
    if (opts.lang === "ko" && m.country !== "대한민국") return false;
    if (opts.lang === "en" && m.country && eastAsia.has(m.country)) return false;
    return true;
  });
  const sorted = [...pool].sort(byWeighted);

  return {
    movies: sorted.slice(fromIdx, fromIdx + size),
    total: sorted.length,
  };
}

// 지정한 slug 들의 큐레이션(+포스터) 만 추려서 반환. (장르 허브의 추천 컬렉션)
export async function getCurationsBySlugs(
  slugs: string[],
): Promise<CurationWithPosters[]> {
  const all = await getCurationsWithPosters();
  const order = new Map(slugs.map((s, i) => [s, i]));
  return all
    .filter((c) => order.has(c.slug))
    .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
}

// tmdb_id → 로컬 movie 행 (읽기 전용, 없으면 null)
export async function getMovieRowByTmdbId(
  tmdbId: number,
): Promise<MovieRow | null> {
  return movieByTmdb.get(tmdbId) ?? null;
}
