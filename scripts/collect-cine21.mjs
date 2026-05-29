/* eslint-disable @typescript-eslint/no-explicit-any */
// 씨네21 전문가 별점 수집 — 영화별 페이지를 파싱(평론가·별점·코멘트가 정확히 묶여 오매칭 없음).
//   흐름: Brave 로 "씨네21 [제목]" → cine21 movie/info URL 획득 → 페이지 파싱
//        → expert_star_list 의 평론가별 (별점10점→5점환산, 한줄평) 추출
//        → 대상 평론가(이동진 등)만 critic_reviews 에 approved 저장.
//   저작권: 짧은 한줄평 + 별점 + 원문(cine21) 링크만.
//
// 환경: LIMIT(영화 수, 기본 80), CRITICS(쉼표구분, 기본 "이동진,박평식,김혜리,정성일")
// 실행: node scripts/collect-cine21.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const BKEY = process.env.BRAVE_SEARCH_KEY, SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!BKEY || !SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const LIMIT = Number(process.env.LIMIT || 80);
const CRITICS = (process.env.CRITICS || "이동진,박평식,김혜리,정성일").split(",").map(s => s.trim());
const DRY = process.env.DRY === "1";

const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function brave(q) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json", "X-Subscription-Token": BKEY } });
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) return [];
      return ((await res.json()).web?.results ?? []).map(r => r.url);
    } catch { await sleep(800); }
  }
  return [];
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const dec = (s) => (s || "").replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// cine21 movie/info HTML → [{name, rating(5점), quote}]
function parseExperts(html) {
  const i = html.indexOf("expert_star_list");
  if (i < 0) return [];
  const seg = html.slice(i, i + 6000);
  const out = [];
  // 각 li 블록: name ... num ... review
  const re = /<p class="name">([^<]+)<\/p>[\s\S]*?<p class="num">([\d.]+)<\/p>[\s\S]*?<div class="review">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(seg))) {
    const name = dec(m[1]);
    const ten = parseFloat(m[2]);
    const quote = dec(m[3]);
    if (!name || !Number.isFinite(ten)) continue;
    out.push({ name, rating: Math.round((ten / 2) * 10) / 10, quote: quote || null });
  }
  return out;
}

async function main() {
  // 대상 영화 — 정렬/필터를 env 로 조정 (씨네21 별점 적중률 높은 대상 선택용)
  //   ORDER: popularity.desc | weighted_rating.desc (기본 popularity)
  //   YEAR_GTE: 개봉연도 하한 (기본 2003 — 씨네21 전문가별점 시작 무렵)
  const ORDER = process.env.ORDER || "popularity.desc";
  const YEAR_GTE = Number(process.env.YEAR_GTE || 2003);
  const movies = [];
  let from = 0;
  while (movies.length < LIMIT * 2) {
    const res = await fetch(`${SB_URL}/rest/v1/movies?select=id,tmdb_id,title,vote_count,release_year&vote_count=gte.300&release_year=gte.${YEAR_GTE}&order=${ORDER}`,
      { headers: { ...sb, Range: `${from}-${from + 199}`, "Range-Unit": "items" } });
    const b = await res.json(); if (!Array.isArray(b) || !b.length) break;
    movies.push(...b); if (b.length < 200) break; from += 200;
  }
  const todo = movies.slice(0, LIMIT);
  console.error(`대상 ${todo.length}편 (order=${ORDER}, year>=${YEAR_GTE}), 평론가 [${CRITICS.join(", ")}]\n`);

  let saved = 0, hitMovies = 0;
  for (const mv of todo) {
    // 1) cine21 URL 찾기
    const urls = await brave(`씨네21 ${mv.title} 영화`);
    const cineUrl = urls.find(u => /cine21\.com\/movie\/info\/?\?movie_id=\d+/.test(u));
    await sleep(1100);
    if (!cineUrl) { console.error(`- ${mv.title}: cine21 URL 없음`); continue; }

    // 2) 파싱
    const html = await fetchHtml(cineUrl);
    await sleep(400);
    if (!html) { console.error(`- ${mv.title}: fetch 실패`); continue; }
    const experts = parseExperts(html);
    const matched = experts.filter(e => CRITICS.includes(e.name) && e.quote && e.quote.length >= 4);
    if (!matched.length) { console.error(`- ${mv.title}: 대상 평론가 평 없음 (전체 ${experts.length}명)`); continue; }

    hitMovies++;
    for (const e of matched) {
      console.error(`✓ ${mv.title} | ${e.name} ★${e.rating} "${e.quote.slice(0, 40)}"`);
      if (DRY) continue;
      // 중복 체크
      const dup = await (await fetch(`${SB_URL}/rest/v1/critic_reviews?movie_id=eq.${mv.id}&critic_name=eq.${encodeURIComponent(e.name)}&select=id`, { headers: sb })).json();
      if (Array.isArray(dup) && dup.length) continue;
      const res = await fetch(`${SB_URL}/rest/v1/critic_reviews`, {
        method: "POST", headers: { ...sb, Prefer: "return=minimal" },
        body: JSON.stringify({
          movie_id: mv.id, critic_name: e.name, source_name: "씨네21", source_url: cineUrl,
          rating: e.rating, short_quote: e.quote, summary: null,
          status: "approved", origin: "auto", confidence_score: 0.95,
        }),
      });
      if (res.ok) saved++;
    }
  }
  console.error(`\n완료. 영화 ${hitMovies}편에서 ${DRY ? "(dry)" : saved + "건 저장"}`);
}
main().catch(e => { console.error(e); process.exit(1); });
