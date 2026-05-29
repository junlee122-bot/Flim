import { NextResponse } from "next/server";
import { getMovieDetail } from "@/lib/tmdb";
import {
  getSearchProvider,
  searchProviderConfigured,
} from "@/lib/search";
import { buildQueries, parseResults } from "@/lib/search/parser";
import type { RawSearchResult } from "@/lib/search/provider";

// POST { tmdbId, criticName } → { candidates }
// 평론가 평 자동 검색. 전문 미수집 — 후보(한줄평/별점/요약/링크)만 반환.
export async function POST(req: Request) {
  let body: { tmdbId?: number; criticName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { tmdbId, criticName } = body;
  if (!tmdbId || !criticName) {
    return NextResponse.json(
      { error: "tmdbId 와 criticName 이 필요합니다." },
      { status: 400 },
    );
  }

  if (!searchProviderConfigured()) {
    return NextResponse.json(
      {
        error:
          "검색 API 키가 설정되지 않았습니다. SEARCH_PROVIDER 와 해당 API 키를 .env.local 에 추가하세요.",
      },
      { status: 503 },
    );
  }

  const detail = await getMovieDetail(tmdbId);
  const title = detail?.title ?? "";
  if (!title) {
    return NextResponse.json(
      { error: "영화 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const provider = getSearchProvider();
  const queries = buildQueries(criticName, title);

  // 쿼리를 병렬 실행 후 합치기
  const batches = await Promise.all(queries.map((q) => provider.search(q)));
  const all: RawSearchResult[] = batches.flat();
  const candidates = parseResults(all, criticName, title);

  return NextResponse.json({ candidates, provider: provider.name });
}
