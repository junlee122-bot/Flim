/* eslint-disable @typescript-eslint/no-explicit-any */
// 검토 완료 평론 저장 — 사람이 교차검증한 평론만 critic_reviews 에 저장(approved).
//   저작권 준수: 짧은 한줄평(인용) + 별점 + 원문 링크만. 전문 미수집.
//   movies 행이 없으면 TMDb 에서 생성.
// 실행: node scripts/import-reviews.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const TMDB_KEY = process.env.TMDB_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("환경변수 누락"); process.exit(1); }

const IMG = "https://image.tmdb.org/t/p";
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// 검토 완료 — 이동진 평론가 (교차검증된 것만)
const REVIEWS = [
  { tmdb: 496243, critic: "이동진", source: "왓챠피디아", rating: 4.5,
    quote: "상승과 하강으로 명징하게 직조해낸 신랄하면서 처연한 계급 우화.",
    url: "https://pedia.watcha.com/comments/xzaQAkqBWN2g5" },
  { tmdb: 11423, critic: "이동진", source: "이동진 한줄평", rating: 5.0,
    quote: "한국영화계가 2003년을 자꾸 되돌아보는 가장 큰 이유.",
    url: "https://m.blog.naver.com/happyn710/222326423840" },
  { tmdb: 843, critic: "이동진", source: "왓챠피디아", rating: 5.0,
    quote: "스쳐가는 순간들로 사랑의 시간을 인수분해하다.",
    url: "https://pedia.watcha.com/comments/xkPEmRRDJ2K3W" },
  { tmdb: 155, critic: "이동진", source: "왓챠피디아", rating: 5.0,
    quote: "내러티브와 스타일을 완벽히 장악한 자의 눈부신 활공.",
    url: "https://pedia.watcha.com/comments/GO6MZrryOMNxa" },
  { tmdb: 157336, critic: "이동진", source: "이동진 한줄평", rating: 4.0,
    quote: "SF를 향한 놀런의 웅대한 꿈.",
    url: "https://m.blog.naver.com/happyn710/222326423840" },
  { tmdb: 438631, critic: "이동진", source: "왓챠피디아", rating: 5.0,
    quote: "하나의 세계를 명확히 채운 온도, 습도, 채도.",
    url: "https://pedia.watcha.com/comments/7JVEodYOb829y" },
  { tmdb: 313369, critic: "이동진", source: "이동진 한줄평", rating: 5.0,
    quote: "달콤쌉싸름한 그 모든 감정에 화룡점정하는 마법 같은 순간.",
    url: "https://m.blog.naver.com/happyn710/222326423840" },
  { tmdb: 1124, critic: "이동진", source: "씨네21", rating: 3.5,
    quote: "흥미롭고 신비로운 반전.",
    url: "https://www.cine21.com/movie/info/?movie_id=20463" },
  { tmdb: 194662, critic: "이동진", source: "이동진 한줄평", rating: 4.0,
    quote: "끊어지기 직전의 외줄 위에서 펼치는 현란한 영화적 곡예.",
    url: "https://m.blog.naver.com/happyn710/222326423840" },
  { tmdb: 630, critic: "이동진", source: "왓챠피디아", rating: 4.5,
    quote: "'악마의 씨' 50주년, 오컬트 무비 대표작 목록에 또 한 편이 추가됐다.",
    url: "https://pedia.watcha.com/comments/W4zQrdqRZp2w1" },
  // 2차: 왓챠피디아에서 "이동진 평론가" 명시로 교차확인된 추가분
  { tmdb: 77, critic: "이동진", source: "왓챠피디아", rating: 4.5,
    quote: "홀린 듯 사로잡히게 되는 구조의 마력.",
    url: "https://pedia.watcha.com/ko-KR/comments/W9bEBPdvnxMpZ" },
];

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits`);
  return res.ok ? res.json() : null;
}

async function ensureMovie(tmdbId) {
  const { 0: existing } = await (await fetch(`${SB_URL}/rest/v1/movies?tmdb_id=eq.${tmdbId}&select=id`, { headers: sb })).json();
  if (existing) return existing.id;
  const m = await tmdb(`/movie/${tmdbId}`);
  if (!m?.id) return null;
  const row = {
    tmdb_id: m.id, imdb_id: m.imdb_id ?? null, title: m.title, original_title: m.original_title,
    release_year: m.release_date ? Number(m.release_date.slice(0,4)) : null,
    director: m.credits?.crew?.find((c)=>c.job==="Director")?.name ?? null,
    country: m.production_countries?.[0]?.name ?? null, runtime: m.runtime ?? null,
    overview: m.overview ?? "", poster_path: m.poster_path?`${IMG}/w500${m.poster_path}`:null,
    backdrop_path: m.backdrop_path?`${IMG}/w1280${m.backdrop_path}`:null,
    genres: (m.genres??[]).map((g)=>g.name), tmdb_rating: m.vote_average?Math.round(m.vote_average*10)/10:null,
    vote_count: m.vote_count ?? 0, popularity: m.popularity ?? 0,
  };
  const r = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method:"POST", headers:{...sb, Prefer:"resolution=merge-duplicates,return=representation"}, body:JSON.stringify(row),
  });
  const [s] = await r.json(); return s?.id ?? null;
}

async function main() {
  let ok = 0;
  for (const rv of REVIEWS) {
    const mid = await ensureMovie(rv.tmdb);
    if (!mid) { console.log(`✗ tmdb ${rv.tmdb} movie 없음`); continue; }
    // 중복 방지: 같은 영화+평론가+출처 이미 있으면 스킵
    const dup = await (await fetch(`${SB_URL}/rest/v1/critic_reviews?movie_id=eq.${mid}&critic_name=eq.${encodeURIComponent(rv.critic)}&select=id`, { headers: sb })).json();
    if (Array.isArray(dup) && dup.length) { console.log(`= ${rv.tmdb} 이미 있음`); continue; }
    const res = await fetch(`${SB_URL}/rest/v1/critic_reviews`, {
      method:"POST", headers:{...sb, Prefer:"return=minimal"},
      body: JSON.stringify({
        movie_id: mid, critic_name: rv.critic, source_name: rv.source, source_url: rv.url,
        rating: rv.rating, short_quote: rv.quote, summary: null,
        status: "approved", origin: "manual", confidence_score: 1,
      }),
    });
    if (res.ok) { ok++; console.log(`✓ tmdb ${rv.tmdb} ★${rv.rating} "${rv.quote.slice(0,30)}…"`); }
    else console.log(`✗ tmdb ${rv.tmdb}: ${res.status} ${(await res.text()).slice(0,100)}`);
  }
  console.log(`\n완료. ${ok}건 저장(approved).`);
}
main().catch((e)=>{console.error(e);process.exit(1);});
