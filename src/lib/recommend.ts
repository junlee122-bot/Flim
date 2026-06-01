import { movies, allAwards, dailyPicksList, movieById } from "./store";
import {
  getMovieDetail,
  getPopularMovies,
  tmdbConfigured,
} from "./tmdb";
import type { MovieRow, Recommendation } from "@/types";

// =============================================================
// 오늘의 추천 영화 — 평점/수상 기반 자동 추천.
//  우선순위:
//   1) 에디터(관리자) 지정 daily_pick
//   2) 정적 movies 점수화 (TMDb 평점 + 수상 가산점) → 날짜 시드 선택
//   3) (데이터 없으면) TMDb top_rated 폴백 → 날짜 시드 선택
//  날짜 시드: 같은 날엔 항상 같은 작품, 날마다 회전.
// =============================================================

function daySeed(): number {
  const now = new Date();
  return (
    now.getUTCFullYear() * 10000 +
    (now.getUTCMonth() + 1) * 100 +
    now.getUTCDate()
  );
}

function rowToRec(
  row: MovieRow,
  reason: string,
  source: Recommendation["source"],
): Recommendation {
  return {
    tmdbId: row.tmdb_id,
    backdropUrl: row.backdrop_path,
    title: row.title,
    year: row.release_year,
    director: row.director,
    posterUrl: row.poster_path,
    overview: row.overview ?? "",
    reason,
    source,
  };
}

export async function getRecommendation(): Promise<Recommendation | null> {
  // 1) 에디터 지정
  const today = new Date().toISOString().slice(0, 10);
  const pick = dailyPicksList.find((p) => p.pick_date === today);
  if (pick) {
    const movie = movieById.get(pick.movie_id);
    if (movie) {
      return rowToRec(
        movie,
        pick.reason || "에디터가 직접 고른 오늘의 추천작",
        "editor",
      );
    }
  }

  // 2) 정적 movies 점수화
  if (movies.length > 0) {
    // TMDb 평점 상위 100편
    const top = [...movies]
      .sort((a, b) => (b.tmdb_rating ?? 0) - (a.tmdb_rating ?? 0))
      .slice(0, 100);

    // 수상 가산점 집계 (won=2, nominated=1)
    const awardScore = new Map<string, number>();
    for (const a of allAwards) {
      const prev = awardScore.get(a.movie_id) ?? 0;
      awardScore.set(a.movie_id, prev + (a.result === "won" ? 2 : 1));
    }

    const scored = top
      .map((m) => {
        const base = m.tmdb_rating ?? 0; // 0~10
        const awards = Math.min(awardScore.get(m.id) ?? 0, 6); // 가산점 상한
        return { m, score: base + awards, awards: awardScore.get(m.id) ?? 0 };
      })
      .sort((a, b) => b.score - a.score);

    const pool = scored.slice(0, Math.min(10, scored.length));
    const chosen = pool[daySeed() % pool.length];
    const parts: string[] = [];
    if (chosen.m.tmdb_rating) parts.push(`TMDb 평점 ${chosen.m.tmdb_rating}`);
    if (chosen.awards > 0) parts.push(`주요 영화제 수상 이력`);
    return rowToRec(
      chosen.m,
      `${parts.join(" · ") || "높은 평가"} 를 기준으로 자동 추천`,
      "auto-db",
    );
  }

  // 3) TMDb top_rated 폴백
  if (tmdbConfigured()) {
    const popular = await getPopularMovies();
    if (popular.length > 0) {
      const chosen = popular[daySeed() % popular.length];
      const detail = await getMovieDetail(chosen.tmdbId);
      return {
        tmdbId: chosen.tmdbId,
        backdropUrl: detail?.backdropUrl ?? null,
        title: chosen.title,
        year: chosen.year,
        director: detail?.director ?? null,
        posterUrl: chosen.posterUrl,
        overview: detail?.overview ?? "",
        reason: "TMDb 평점 상위 작품 중 자동 추천",
        source: "auto-tmdb",
      };
    }
  }

  return null;
}
