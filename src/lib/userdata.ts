// 클라이언트 개인화 데이터 (localStorage). 서버 저장 없음 — 브라우저 로컬.
export const WATCHED_KEY = "flim_watched";
export const RATINGS_KEY = "flim_ratings";

export type RatedMovie = {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  rating: number; // 0.5 ~ 5
  at: number; // timestamp
};

export function getWatched(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WATCHED_KEY) || "[]");
  } catch {
    return [];
  }
}
export function setWatched(ids: number[]) {
  localStorage.setItem(WATCHED_KEY, JSON.stringify(ids));
}

export function getRatings(): Record<string, RatedMovie> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
export function setRating(m: RatedMovie) {
  const all = getRatings();
  all[m.tmdbId] = m;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
}
export function removeRating(tmdbId: number) {
  const all = getRatings();
  delete all[tmdbId];
  localStorage.setItem(RATINGS_KEY, JSON.stringify(all));
}
