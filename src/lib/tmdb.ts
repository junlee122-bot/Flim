import type { MovieSummary, MovieDetail } from "@/types";

const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export function tmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN);
}

function authParams(): { headers: HeadersInit; keyQuery: string } {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    return { headers: { Authorization: `Bearer ${token}` }, keyQuery: "" };
  }
  const key = process.env.TMDB_API_KEY ?? "";
  return { headers: {}, keyQuery: `&api_key=${key}` };
}

async function tmdb<T>(path: string, params = ""): Promise<T | null> {
  if (!tmdbConfigured()) return null;
  const { headers, keyQuery } = authParams();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}language=ko-KR${params}${keyQuery}`;
  try {
    const res = await fetch(url, { headers, next: { revalidate: 60 * 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function posterUrl(path: string | null, size = "w500") {
  return path ? `${IMG}/${size}${path}` : null;
}

type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  runtime?: number;
  vote_average?: number;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  imdb_id?: string;
  production_countries?: { iso_3166_1: string; name: string }[];
  credits?: {
    cast?: { name: string; character?: string; profile_path?: string | null }[];
    crew?: { name: string; job: string }[];
  };
  images?: { backdrops?: { file_path: string }[] };
  videos?: {
    results?: {
      key: string;
      site: string;
      type: string;
      official?: boolean;
    }[];
  };
};

function yearOf(date?: string): number | null {
  if (!date) return null;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export async function searchMovies(query: string): Promise<MovieSummary[]> {
  if (!query.trim()) return [];
  const data = await tmdb<{ results: TmdbMovie[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&include_adult=false`,
  );
  if (!data?.results) return [];
  // 검색 결과의 감독/국가는 비싸므로 상위 결과에 대해서만 보강하지 않고
  // 목록에서는 가벼운 필드만, 감독은 상세에서 채운다.
  return data.results.slice(0, 20).map((m) => ({
    tmdbId: m.id,
    title: m.title,
    originalTitle: m.original_title,
    year: yearOf(m.release_date),
    director: null,
    country: null,
    genres: [],
    posterUrl: posterUrl(m.poster_path),
  }));
}

export async function getMovieDetail(
  tmdbId: number,
): Promise<MovieDetail | null> {
  const m = await tmdb<TmdbMovie>(
    `/movie/${tmdbId}?append_to_response=credits,images,videos&include_image_language=ko,en,null&include_video_language=ko,en`,
  );
  if (!m) return null;

  const director =
    m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const cast = (m.credits?.cast ?? []).slice(0, 8).map((c) => c.name);
  // 사진·배역까지 포함한 출연진(상위 10명)
  const castDetailed = (m.credits?.cast ?? []).slice(0, 10).map((c) => ({
    name: c.name,
    character: c.character ?? null,
    profileUrl: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
  }));
  // YouTube 예고편 키 (공식 Trailer 우선)
  const ytVideos = (m.videos?.results ?? []).filter(
    (v) => v.site === "YouTube",
  );
  const trailer =
    ytVideos.find((v) => v.type === "Trailer" && v.official) ??
    ytVideos.find((v) => v.type === "Trailer") ??
    ytVideos.find((v) => v.type === "Teaser") ??
    null;
  const trailerKey = trailer?.key ?? null;
  const country = m.production_countries?.[0]?.name ?? null;
  const stills = (m.images?.backdrops ?? [])
    .slice(0, 6)
    .map((b) => posterUrl(b.file_path, "w780")!)
    .filter(Boolean);

  return {
    tmdbId: m.id,
    imdbId: m.imdb_id ?? null,
    title: m.title,
    originalTitle: m.original_title,
    year: yearOf(m.release_date),
    director,
    country,
    cast,
    castDetailed,
    trailerKey,
    genres: (m.genres ?? []).map((g) => g.name),
    runtime: m.runtime ?? null,
    overview: m.overview ?? "",
    posterUrl: posterUrl(m.poster_path),
    backdropUrl: posterUrl(m.backdrop_path, "w1280"),
    stills,
    tmdbRating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
  };
}

// 추천/큐레이션 시드용: 인기/높은 평점 영화
export async function getPopularMovies(): Promise<MovieSummary[]> {
  const data = await tmdb<{ results: TmdbMovie[] }>(
    `/movie/top_rated?page=1`,
  );
  if (!data?.results) return [];
  return data.results.slice(0, 12).map((m) => ({
    tmdbId: m.id,
    title: m.title,
    originalTitle: m.original_title,
    year: yearOf(m.release_date),
    director: null,
    country: null,
    genres: [],
    posterUrl: posterUrl(m.poster_path),
  }));
}
