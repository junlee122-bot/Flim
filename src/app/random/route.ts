import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// 랜덤 영화 — 가중평점 상위 풀에서 무작위 1편으로 리다이렉트(주사위).
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const sb = await getSupabaseServer();
  if (!sb) return NextResponse.redirect(`${origin}/`);
  // 평점 좋은 영화(투표 충분) 상위 500편 중 랜덤
  const { data } = await sb
    .from("movies")
    .select("tmdb_id")
    .gte("vote_count", 500)
    .not("poster_path", "is", null)
    .order("weighted_rating", { ascending: false, nullsFirst: false })
    .limit(500);
  const rows = (data as { tmdb_id: number }[]) ?? [];
  if (rows.length === 0) return NextResponse.redirect(`${origin}/`);
  const pick = rows[Math.floor(Math.random() * rows.length)];
  return NextResponse.redirect(`${origin}/movies/${pick.tmdb_id}`);
}
