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
    cast?: {
      id: number;
      name: string;
      character?: string;
      profile_path?: string | null;
    }[];
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
    id: c.id,
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
  const data = await tmdb<{ results: TmdbMovie[] }>(`/movie/top_rated?page=1`);
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

// TMDb 장르 ID 맵 (검색 필터용)
export const TMDB_GENRES: { id: number; name: string }[] = [
  { id: 28, name: "액션" },
  { id: 12, name: "모험" },
  { id: 16, name: "애니메이션" },
  { id: 35, name: "코미디" },
  { id: 80, name: "범죄" },
  { id: 99, name: "다큐멘터리" },
  { id: 18, name: "드라마" },
  { id: 10751, name: "가족" },
  { id: 14, name: "판타지" },
  { id: 36, name: "역사" },
  { id: 27, name: "공포" },
  { id: 10402, name: "음악" },
  { id: 9648, name: "미스터리" },
  { id: 10749, name: "로맨스" },
  { id: 878, name: "SF" },
  { id: 53, name: "스릴러" },
  { id: 10752, name: "전쟁" },
  { id: 37, name: "서부" },
];

export const DECADES = [
  { key: "2020s", label: "2020년대", gte: "2020-01-01", lte: "2029-12-31" },
  { key: "2010s", label: "2010년대", gte: "2010-01-01", lte: "2019-12-31" },
  { key: "2000s", label: "2000년대", gte: "2000-01-01", lte: "2009-12-31" },
  { key: "1990s", label: "1990년대", gte: "1990-01-01", lte: "1999-12-31" },
  { key: "1980s", label: "1980년대", gte: "1980-01-01", lte: "1989-12-31" },
  { key: "1970s", label: "1970년대", gte: "1970-01-01", lte: "1979-12-31" },
  { key: "1960s", label: "1960년대", gte: "1960-01-01", lte: "1969-12-31" },
  { key: "older", label: "그 이전", gte: "1900-01-01", lte: "1959-12-31" },
];

// 장르/연대 필터로 영화 탐색 (discover, 평점순)
export async function discoverMovies(opts: {
  genre?: number;
  decade?: string;
  sort?: string;
}): Promise<MovieSummary[]> {
  const dec = DECADES.find((d) => d.key === opts.decade);
  const params = [
    `sort_by=${opts.sort || "vote_average.desc"}`,
    "vote_count.gte=200",
    "include_adult=false",
  ];
  if (opts.genre) params.push(`with_genres=${opts.genre}`);
  if (dec) {
    params.push(`primary_release_date.gte=${dec.gte}`);
    params.push(`primary_release_date.lte=${dec.lte}`);
  }
  const data = await tmdb<{ results: TmdbMovie[] }>(
    `/discover/movie?${params.join("&")}`,
  );
  if (!data?.results) return [];
  return data.results.slice(0, 24).map((m) => ({
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

// ── 인물(감독/배우) 상세 ──────────────────────────────
export type PersonDetail = {
  id: number;
  name: string;
  biography: string;
  knownFor: string | null; // Acting | Directing ...
  profileUrl: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  filmography: MovieSummary[]; // 대표작 (감독작 우선, 없으면 출연작)
  role: "director" | "actor";
};

type TmdbPerson = {
  id: number;
  name: string;
  biography?: string;
  known_for_department?: string;
  profile_path?: string | null;
  birthday?: string | null;
  place_of_birth?: string | null;
  movie_credits?: {
    cast?: (TmdbMovie & { vote_count?: number })[];
    crew?: (TmdbMovie & { job?: string; vote_count?: number })[];
  };
};

export async function getPersonDetail(
  personId: number,
): Promise<PersonDetail | null> {
  const p = await tmdb<TmdbPerson>(
    `/person/${personId}?append_to_response=movie_credits`,
  );
  if (!p) return null;

  const directed = (p.movie_credits?.crew ?? []).filter(
    (c) => c.job === "Director",
  );
  const isDirector =
    p.known_for_department === "Directing" || directed.length >= 3;
  const role: "director" | "actor" = isDirector ? "director" : "actor";

  const pool = (isDirector ? directed : (p.movie_credits?.cast ?? [])).filter(
    (m) => m.poster_path,
  );
  // 중복 제거 + 투표수→평점 순 상위 18
  const seen = new Set<number>();
  const uniq = pool.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
  uniq.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const top = uniq.slice(0, 24).sort((a, b) => {
    const ya = yearOf(a.release_date) ?? 0;
    const yb = yearOf(b.release_date) ?? 0;
    return yb - ya; // 최신순
  });

  return {
    id: p.id,
    name: p.name,
    biography: p.biography ?? "",
    knownFor: p.known_for_department ?? null,
    profileUrl: p.profile_path ? `${IMG}/w300${p.profile_path}` : null,
    birthday: p.birthday ?? null,
    placeOfBirth: p.place_of_birth ?? null,
    role,
    filmography: top.slice(0, 18).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      originalTitle: m.original_title,
      year: yearOf(m.release_date),
      director: null,
      country: null,
      genres: [],
      posterUrl: posterUrl(m.poster_path),
    })),
  };
}

// 영화 상세에서 감독 이름 → person id 찾기 (링크용)
export async function findPersonId(name: string): Promise<number | null> {
  if (!name.trim()) return null;
  const d = await tmdb<{ results: { id: number }[] }>(
    `/search/person?query=${encodeURIComponent(name)}`,
  );
  return d?.results?.[0]?.id ?? null;
}
