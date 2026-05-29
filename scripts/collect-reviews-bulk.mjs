/* eslint-disable @typescript-eslint/no-explicit-any */
// 평론 대량 수집 — 평점순 상위 영화에 대해 Brave 로 이동진 평을 1편 1쿼리로 수집.
//   휴리스틱 1차 검토:
//     - 신뢰 패턴(네이버 한줄평 아카이브 ★+제목+한줄평 / 언론 명시 인용 / 왓챠 comments)
//       → approved
//     - 그 외 한줄평/별점이 잡히면 → pending(관리자 검토 대기)
//     - 아무것도 못 잡으면 → 저장 안 함
//   저작권 준수: 짧은 한줄평 + 별점 + 원문 링크만.
//
// 환경: BUDGET(쿼리 상한, 기본 600), CRITIC(기본 이동진), MIN_VOTES(기본 500)
// 실행: node scripts/collect-reviews-bulk.mjs

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
const BKEY = process.env.BRAVE_SEARCH_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!BKEY || !SB_URL || !SB_KEY) { console.error("환경변수 누락 (BRAVE_SEARCH_KEY/SUPABASE_*)"); process.exit(1); }

const CRITIC = process.env.CRITIC || "이동진";
const BUDGET = Number(process.env.BUDGET || 600);
const MIN_VOTES = Number(process.env.MIN_VOTES || 500);

const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function brave(q) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json", "X-Subscription-Token": BKEY } },
      );
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) return [];
      const d = await res.json();
      return (d.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.description ?? "" }));
    } catch { await sleep(800); }
  }
  return [];
}

function host(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function dec(s) {
  return (s||"").replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&quot;/g,'"')
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/<\/?strong>/g,"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
}
function extractRating(text) {
  const stars=(text.match(/★/g)||[]).length, half=/½|☆/.test(text);
  if (stars>0&&stars<=5) return stars+(half?0.5:0);
  const frac=text.match(/(\d(?:\.\d)?)\s*\/\s*(5|10)/);
  if (frac){const v=parseFloat(frac[1]),b=parseInt(frac[2]);return Math.round((b===10?v/2:v)*10)/10;}
  const lab=text.match(/별점\s*[:：]?\s*(\d(?:\.\d)?)/);
  if (lab){const v=parseFloat(lab[1]);return v>5?Math.round(v/2*10)/10:v;}
  if (/네 ?개 ?반|4개 ?반/.test(text)) return 4.5;
  return null;
}

// 한 영화의 검색 결과에서 (rating, quote, source, url, status) 도출
function judge(results, title) {
  // 1순위: 네이버 한줄평 아카이브 패턴  "★★★★★ 제목(연도) - 한줄평"
  for (const r of results) {
    const s = dec(r.snippet);
    const m = s.match(/([★☆½]{1,6})\s*([^-–—]{0,40}?)\s*[-–—]\s*([^.\n]{6,90}[.])/);
    if (m && (s.includes(title) || m[2].includes(title) || host(r.url).includes("naver"))) {
      const stars = (m[1].match(/★/g)||[]).length + (/½|☆/.test(m[1])?0.5:0);
      const quote = m[3].trim();
      if (quote.length >= 6 && stars >= 1) {
        return { rating: stars, quote, source: "이동진 한줄평", url: r.url, status: "approved", conf: 0.92 };
      }
    }
  }
  // 2순위: 언론 명시 인용  "한줄평으로는 'XXX'" / "라는 한줄평"
  for (const r of results) {
    const s = dec(r.snippet);
    if (!s.includes(CRITIC)) continue;
    const m = s.match(/[""'']([^""'']{8,90})[""''](?:\s*(?:라(?:는|고)|이라(?:는|고)))?\s*(?:한줄평|평)/)
          || s.match(/한줄평[^""'']{0,8}[""'']([^""'']{8,90})[""'']/);
    if (m) {
      const h = host(r.url);
      const trusted = ["chosun","hani","hankyung","joins","donga","mt.co.kr","moneys","topstarnews","newsis","yna","maxmovie","movist"].some(x=>h.includes(x));
      return { rating: extractRating(s), quote: m[1].trim(), source: h, url: r.url,
               status: trusted ? "approved" : "pending", conf: trusted ? 0.85 : 0.6 };
    }
  }
  // 3순위: 왓챠피디아 코멘트 (이동진 검색맥락) — 한줄평일 가능성, 검토 대기
  for (const r of results) {
    if (!host(r.url).includes("watcha") || !r.url.includes("/comments/")) continue;
    const s = dec(r.snippet);
    if (s.length < 8 || s.length > 100) continue;
    return { rating: extractRating(s), quote: s.replace(/\.$/,"")+".", source: "왓챠피디아",
             url: r.url, status: "pending", conf: 0.6 };
  }
  return null;
}

async function main() {
  // 평점순 상위 영화 (유명작) 가져오기
  const movies = [];
  let from = 0;
  while (movies.length < 3000) {
    const res = await fetch(
      `${SB_URL}/rest/v1/movies?select=id,tmdb_id,title,vote_count&vote_count=gte.${MIN_VOTES}&order=weighted_rating.desc`,
      { headers: { ...sb, Range: `${from}-${from+999}`, "Range-Unit": "items" } },
    );
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    movies.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  // 이미 이 평론가 평이 있는 영화는 스킵
  const existing = new Set(
    (await (await fetch(`${SB_URL}/rest/v1/critic_reviews?select=movie_id&critic_name=eq.${encodeURIComponent(CRITIC)}`, { headers: sb })).json())
      .map((r) => r.movie_id),
  );

  const todo = movies.filter((m) => !existing.has(m.id)).slice(0, BUDGET);
  console.log(`대상 ${todo.length}편 (vote>=${MIN_VOTES}, 예산 ${BUDGET}쿼리). 시작…\n`);

  let approved = 0, pending = 0, miss = 0, q = 0;
  for (const mv of todo) {
    q++;
    const results = await brave(`${CRITIC} ${mv.title} 한줄평 별점`);
    const v = judge(results, mv.title);
    if (!v || !v.quote) { miss++; }
    else {
      const res = await fetch(`${SB_URL}/rest/v1/critic_reviews`, {
        method: "POST", headers: { ...sb, Prefer: "return=minimal" },
        body: JSON.stringify({
          movie_id: mv.id, critic_name: CRITIC, source_name: v.source, source_url: v.url,
          rating: v.rating, short_quote: v.quote, summary: null,
          status: v.status, origin: "auto", confidence_score: v.conf,
        }),
      });
      if (res.ok) { v.status === "approved" ? approved++ : pending++; }
    }
    if (q % 25 === 0) process.stdout.write(`\r진행 ${q}/${todo.length} · 승인 ${approved} 대기 ${pending} 미발견 ${miss}   `);
    await sleep(1100); // Brave 무료 rate limit (≈1 req/s)
  }
  console.log(`\n\n완료. 쿼리 ${q} · 승인 ${approved} · 검토대기 ${pending} · 미발견 ${miss}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
