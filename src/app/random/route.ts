import { NextResponse } from "next/server";
import { movies } from "@/lib/store";

// 랜덤 영화 — 가중평점 상위 풀에서 무작위 1편으로 리다이렉트(주사위).
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  // 평점 좋은 영화(투표 충분) 상위 500편 중 랜덤
  const pool = movies
    .filter((m) => m.vote_count >= 500 && m.poster_path)
    .sort((a, b) => (b.weighted_rating ?? 0) - (a.weighted_rating ?? 0))
    .slice(0, 500);
  if (pool.length === 0) return NextResponse.redirect(`${origin}/`);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.redirect(`${origin}/movies/${pick.tmdb_id}`);
}
