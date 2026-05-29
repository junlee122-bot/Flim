/* eslint-disable @typescript-eslint/no-explicit-any */
// 평론 후보 수집기 — Brave 로 영화×평론가 평을 검색해 후보를 JSON 으로 출력(저장 안 함).
//   사람이 결과를 보고 검토 후 import-reviews.mjs 로 선별 저장.
// 실행: node scripts/collect-reviews.mjs

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
if (!BKEY) { console.error("BRAVE_SEARCH_KEY 누락 (.seed-env 에 추가)"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function brave(q) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json", "X-Subscription-Token": BKEY } },
      );
      if (res.status === 429) { await sleep(2000); continue; }
      if (!res.ok) return [];
      const d = await res.json();
      return (d.web?.results ?? []).map((r) => ({
        title: r.title, url: r.url, snippet: r.description ?? "",
      }));
    } catch { await sleep(500); }
  }
  return [];
}

function host(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }

function classify(url) {
  const h = host(url);
  if (h.includes("cine21")) return { w: 1.0, name: "씨네21" };
  if (h.includes("pedia.watcha") || h.includes("watcha")) return { w: 0.85, name: "왓챠피디아" };
  if (["chosun","hani","hankyung","joins","donga","mt.co.kr","moneys","maxmovie","movist","topstarnews","newsis","yna.co.kr"].some(x=>h.includes(x)))
    return { w: 0.8, name: h };
  if (h.includes("naver")) return { w: 0.6, name: "네이버" };
  if (h.includes("tistory") || h.includes("brunch") || h.includes("daum")) return { w: 0.45, name: h };
  return { w: 0.3, name: h };
}

function decodeEnt(s) {
  return s.replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&quot;/g,'"')
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/<\/?strong>/g,"").replace(/<[^>]+>/g,"").trim();
}

function extractRating(text) {
  const stars = (text.match(/★/g) || []).length;
  const half = /½|☆/.test(text);
  if (stars > 0 && stars <= 5) return stars + (half ? 0.5 : 0);
  const frac = text.match(/(\d(?:\.\d)?)\s*\/\s*(5|10)/);
  if (frac) { const v=parseFloat(frac[1]), b=parseInt(frac[2]); return Math.round((b===10?v/2:v)*10)/10; }
  const labeled = text.match(/별점\s*[:：]?\s*(\d(?:\.\d)?)/);
  if (labeled) { const v=parseFloat(labeled[1]); return v>5?Math.round(v/2*10)/10:v; }
  // "별 네 개 반" / "별점 4개 반" 류
  if (/네 ?개 ?반|4개 ?반|4\.5/.test(text)) return 4.5;
  if (/다섯 ?개|5개/.test(text)) return 5;
  return null;
}

// 대상: (tmdb_id, 제목) — 이동진이 평한 대표작 위주
const LIST = [
  [496243, "기생충"], [670, "올드보이"], [11423, "살인의 추억"], [843, "화양연화"],
  [155, "다크 나이트"], [157336, "인터스텔라"], [777245, "헤어질 결심"],
  [438631, "듄"], [313369, "라라랜드"], [496243, "기생충"],
  [1124, "프레스티지"], [194662, "버드맨"], [630, "유전"], // 일부는 이동진 평 없을 수 있음
];

const CRITIC = "이동진";

async function main() {
  const out = [];
  const seenMovie = new Set();
  for (const [tmdbId, title] of LIST) {
    if (seenMovie.has(tmdbId)) continue;
    seenMovie.add(tmdbId);
    const queries = [
      `${CRITIC} ${title} 별점`,
      `${CRITIC} ${title} 한줄평`,
      `왓챠피디아 ${CRITIC} ${title}`,
    ];
    const batches = [];
    for (const q of queries) { batches.push(...await brave(q)); await sleep(300); }

    const seenUrl = new Set();
    const cands = [];
    for (const r of batches) {
      if (!r.url || seenUrl.has(r.url)) continue;
      seenUrl.add(r.url);
      const hay = decodeEnt(`${r.title} ${r.snippet}`);
      if (!hay.includes(CRITIC) && !host(r.url).includes("watcha")) continue;
      const tier = classify(r.url);
      const rating = extractRating(hay);
      const quoted = decodeEnt(r.snippet).match(/[""“”'’](.{6,80}?)[""“”'’]/);
      let conf = tier.w * 0.6;
      if (hay.includes(CRITIC)) conf += 0.2;
      if (hay.includes(title)) conf += 0.1;
      if (rating != null) conf += 0.05;
      conf = Math.min(1, Math.round(conf*100)/100);
      cands.push({
        source: tier.name, url: r.url, rating,
        snippet: decodeEnt(r.snippet).slice(0, 160),
        quote: quoted ? quoted[1] : null,
        conf,
      });
    }
    cands.sort((a,b)=>b.conf-a.conf);
    out.push({ tmdbId, title, critic: CRITIC, candidates: cands.slice(0, 6) });
    console.error(`수집: ${title} (${cands.length}건)`);
  }
  // stdout 으로 JSON (검토용)
  console.log(JSON.stringify(out, null, 2));
}
main();
