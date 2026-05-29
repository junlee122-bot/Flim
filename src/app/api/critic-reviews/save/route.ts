import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureMovieRow } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ReviewCandidate } from "@/types";

// POST { tmdbId, candidates[] } → 자동수집 후보를 'pending'/'auto' 로 저장 (관리자 전용)
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  let body: { tmdbId?: number; candidates?: ReviewCandidate[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { tmdbId, candidates } = body;
  if (!tmdbId || !Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json(
      { error: "tmdbId 와 candidates 가 필요합니다." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase 가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const row = await ensureMovieRow(tmdbId);
  if (!row) {
    return NextResponse.json(
      { error: "영화 행을 생성할 수 없습니다." },
      { status: 500 },
    );
  }

  const rows = candidates.map((c) => ({
    movie_id: row.id,
    critic_name: c.criticName,
    source_name: c.sourceName,
    source_url: c.sourceUrl,
    rating: c.rating,
    short_quote: c.shortQuote,
    summary: c.summary,
    confidence_score: c.confidenceScore,
    status: "pending" as const,
    origin: "auto" as const,
  }));

  const { data, error } = await admin
    .from("critic_reviews")
    .insert(rows)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ inserted: data?.length ?? rows.length });
}
