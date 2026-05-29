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
  is_published?: boolean;
};

// 큐레이션 + 대표 포스터 몇 장 (카드 모자이크용)
export type CurationWithPosters = Curation & {
  posters: string[];
  count: number;
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

// 오늘의 추천 영화 (에디터 지정 / 평점·수상 기반 자동)
export type Recommendation = {
  tmdbId: number;
  backdropUrl?: string | null;
  title: string;
  year: number | null;
  director: string | null;
  posterUrl: string | null;
  overview: string;
  reason: string;
  source: "editor" | "auto-db" | "auto-tmdb";
};

// KOFIC 박스오피스 항목
export type BoxOfficeItem = {
  rank: number;
  movieNm: string;
  openDt: string;
  audiAcc: string; // 누적 관객수
  rankInten: string; // 전일 대비 등락
  audiCnt: string; // 당일 관객수
};

// KOFIC 영화 상세 보강 정보
export type KoficInfo = {
  movieNm: string;
  openDt: string | null;
  showTm: string | null; // 상영시간(분)
  prdtStatNm: string | null; // 제작상태
  watchGradeNm: string | null; // 관람등급
  nations: string[];
  genres: string[];
  companyNm: string | null; // 배급/제작사
};

