// 도메인 타입 정의

export type MovieRow = {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  original_title: string | null;
  release_year: number | null;
  director: string | null;
  country: string | null;
  runtime: number | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: string[] | null;
  tmdb_rating: number | null;
  created_at?: string;
};

// 검색 결과 / 상세에서 쓰는 가벼운 영화 요약 (TMDb 기반)
export type MovieSummary = {
  tmdbId: number;
  title: string;
  originalTitle: string;
  year: number | null;
  director: string | null;
  country: string | null;
  genres: string[];
  posterUrl: string | null;
};

export type MovieDetail = MovieSummary & {
  imdbId: string | null;
  cast: string[];
  runtime: number | null;
  overview: string;
  backdropUrl: string | null;
  stills: string[];
  tmdbRating: number | null;
};

export type ExternalRatings = {
  imdb: string | null;
  metacritic: string | null;
  rottenTomatoes: string | null; // OMDb 가 제공하면 채움, 아니면 "추후 연동 예정"
};

export type Award = {
  id: string;
  festival: string;
  category: string | null;
  year: number | null;
  result: string;
  note: string | null;
};

export type CriticReview = {
  id: string;
  movie_id: string;
  critic_name: string;
  source_name: string | null;
  source_url: string | null;
  rating: number | null;
  short_quote: string | null;
  summary: string | null;
  collected_at: string;
  status: "pending" | "approved" | "rejected";
  confidence_score: number;
  origin: "manual" | "auto";
};

export type Curation = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  sort_order: number;
  is_published: boolean;
};

// 자동검색 후보 (DB 저장 전 미리보기용)
export type ReviewCandidate = {
  criticName: string;
  sourceName: string;
  sourceUrl: string;
  rating: number | null;
  shortQuote: string | null;
  summary: string | null;
  confidenceScore: number;
};
