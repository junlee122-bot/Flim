import { getSupabaseServer } from "./supabase/server";
import { getSupabaseAdmin } from "./supabase/admin";
import { getMovieDetail } from "./tmdb";
import type {
  Award,
  CriticReview,
  Curation,
  CurationWithPosters,
  MovieDetail,
  MovieRow,
} from "@/types";

// =============================================================
// Supabase 데이터 접근 헬퍼.
// 모든 함수는 Supabase 미설정 시 빈 값으로 안전하게 폴백한다.
// =============================================================

// 큐레이션 목록 (메인/큐레이션 페이지)
export async function getCurations(): Promise<Curation[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from("curations")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  return (data as Curation[]) ?? [];
}

// 큐레이션 목록 + 각 큐레이션의 대표 포스터(최대 4장) + 총 편수.
// 한 번의 조인 쿼리로 가져온 뒤 메모리에서 묶는다.
export async function getCurationsWithPosters(): Promise<CurationWithPosters[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from("curations")
    .select(
      "id, slug, title, description, cover_image, sort_order, curation_movies(position, movies(poster_path))",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  type Row = Curation & {
    curation_movies: {
      position: number | null;
      movies: { poster_path: string | null } | null;
    }[];
  };

  return ((data as unknown as Row[]) ?? []).map((c) => {
    const links = [...(c.curation_movies ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    const posters = links
      .map((l) => l.movies?.poster_path)
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
      count: c.curation_movies?.length ?? 0,
    };
  });
}

export async function getCurationBySlug(
  slug: string,
): Promise<{ curation: Curation; movies: MovieRow[] } | null> {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data: curation } = await sb
    .from("curations")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!curation) return null;
  const { data: rows } = await sb
    .from("curation_movies")
    .select("position, movies(*)")
    .eq("curation_id", (curation as Curation).id)
    .order("position", { ascending: true });
  const movies = ((rows as unknown as { movies: MovieRow }[]) ?? [])
    .map((r) => r.movies)
    .filter(Boolean);
  return { curation: curation as Curation, movies };
}

// 오늘의 추천 영화 — 관리자 지정 > 없으면 null
export async function getDailyPick(): Promise<MovieRow | null> {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("daily_picks")
    .select("reason, movies(*)")
    .eq("pick_date", today)
    .maybeSingle();
  const row = data as unknown as { movies: MovieRow } | null;
  return row?.movies ?? null;
}

// 이 영화(로컬 movie 행)가 속한 큐레이션 목록 (상세 페이지 탐색용)
export async function getCurationsForMovie(
  movieDbId: string,
): Promise<Pick<Curation, "slug" | "title">[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from("curation_movies")
    .select("curations(slug, title, is_published)")
    .eq("movie_id", movieDbId);
  const rows =
    (data as unknown as {
      curations: { slug: string; title: string; is_published: boolean } | null;
    }[]) ?? [];
  return rows
    .map((r) => r.curations)
    .filter((c): c is { slug: string; title: string; is_published: boolean } =>
      Boolean(c && c.is_published !== false),
    )
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
  const sb = await getSupabaseServer();
  if (!sb) return [];
  let q = sb
    .from("movies")
    .select("*")
    .gte("vote_count", 200)
    .not("poster_path", "is", null);

  if (filter.genres && filter.genres.length > 0) {
    q = q.overlaps("genres", filter.genres);
  }
  if (filter.decade) {
    const dec = parseInt(filter.decade, 10);
    if (Number.isFinite(dec)) {
      if (filter.decade === "older") q = q.lte("release_year", 1959);
      else q = q.gte("release_year", dec).lte("release_year", dec + 9);
    }
  }
  if (filter.maxRuntime) q = q.lte("runtime", filter.maxRuntime).gt("runtime", 0);
  if (filter.minRating) q = q.gte("tmdb_rating", filter.minRating);

  // 본 영화 제외 (PostgREST not.in)
  if (filter.excludeTmdbIds && filter.excludeTmdbIds.length > 0) {
    q = q.not("tmdb_id", "in", `(${filter.excludeTmdbIds.join(",")})`);
  }

  // 가중평점 상위 150편을 풀로 가져와 시드 셔플 → count 편
  const { data } = await q
    .order("weighted_rating", { ascending: false, nullsFirst: false })
    .limit(150);
  const pool = (data as MovieRow[]) ?? [];
  if (pool.length === 0) return [];

  // 시드 기반 셔플 (같은 시드=같은 결과, 재추첨 시 시드 변경)
  let s = (filter.seed ?? 1) * 9301 + 49297;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

// 승인된 평론만 (상세 페이지 공개용)
export async function getApprovedReviews(
  movieDbId: string,
): Promise<CriticReview[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from("critic_reviews")
    .select("*")
    .eq("movie_id", movieDbId)
    .eq("status", "approved")
    .order("confidence_score", { ascending: false });
  return (data as CriticReview[]) ?? [];
}

export async function getAwards(movieDbId: string): Promise<Award[]> {
  const sb = await getSupabaseServer();
  if (!sb) return [];
  const { data } = await sb
    .from("awards")
    .select("*")
    .eq("movie_id", movieDbId)
    .order("year", { ascending: false });
  return (data as Award[]) ?? [];
}

// tmdb_id 로 로컬 movie 행을 찾고, 없으면 TMDb 에서 가져와 upsert.
// 평론/수상을 붙이려면 movies 행이 반드시 필요하므로 이 헬퍼가 보장한다.
export async function ensureMovieRow(
  tmdbId: number,
  detail?: MovieDetail | null,
): Promise<MovieRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing } = await admin
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (existing) return existing as MovieRow;

  const d = detail ?? (await getMovieDetail(tmdbId));
  if (!d) return null;

  const { data: inserted } = await admin
    .from("movies")
    .insert({
      tmdb_id: d.tmdbId,
      imdb_id: d.imdbId,
      title: d.title,
      original_title: d.originalTitle,
      release_year: d.year,
      director: d.director,
      country: d.country,
      runtime: d.runtime,
      overview: d.overview,
      poster_path: d.posterUrl,
      backdrop_path: d.backdropUrl,
      genres: d.genres,
      tmdb_rating: d.tmdbRating,
    })
    .select("*")
    .single();
  return (inserted as MovieRow) ?? null;
}

// 전체 카탈로그 둘러보기 — 적재된 movies 를 정렬/페이지네이션.
export type BrowseSort = "rating" | "popular" | "year" | "title";
export async function browseMovies(opts: {
  sort?: BrowseSort;
  page?: number;
  pageSize?: number;
}): Promise<{ movies: MovieRow[]; total: number }> {
  const sb = await getSupabaseServer();
  if (!sb) return { movies: [], total: 0 };
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.pageSize ?? 36;
  const fromIdx = (page - 1) * size;
  const toIdx = fromIdx + size - 1;

  let query = sb.from("movies").select("*", { count: "exact" });
  if (opts.sort === "year") {
    query = query.order("release_year", { ascending: false, nullsFirst: false });
  } else if (opts.sort === "title") {
    query = query.order("title", { ascending: true });
  } else if (opts.sort === "popular") {
    query = query.order("popularity", { ascending: false, nullsFirst: false });
  } else {
    // 평점순: 베이지안 가중평점(weighted_rating) 으로 정렬 — 투표가 적을수록
    // 전체 평균 쪽으로 보정되어, 소수 표로 평점만 높은 마이너작이 위로 오지 않는다.
    // 최소한의 신뢰도 게이트(투표 100+)도 함께 적용.
    query = query
      .gte("vote_count", 100)
      .order("weighted_rating", { ascending: false, nullsFirst: false })
      .order("vote_count", { ascending: false });
  }
  const { data, count } = await query.range(fromIdx, toIdx);
  return { movies: (data as MovieRow[]) ?? [], total: count ?? 0 };
}

// tmdb_id → 로컬 movie 행 (읽기 전용, 없으면 null)
export async function getMovieRowByTmdbId(
  tmdbId: number,
): Promise<MovieRow | null> {
  const sb = await getSupabaseServer();
  if (!sb) return null;
  const { data } = await sb
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  return (data as MovieRow) ?? null;
}
