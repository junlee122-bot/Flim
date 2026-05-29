/* eslint-disable @typescript-eslint/no-explicit-any */
// 영화 대량 적재 — TMDb discover/top_rated/popular/장르별을 긁어 movies 에 bulk upsert.
//   discover 리스트 필드만으로 적재(빠름). director/runtime 등은 상세 방문 시 TMDb 실시간.
//   멱등(on_conflict=tmdb_id). 목표 편수 도달 또는 소스 소진 시 종료.
//
// 실행: node scripts/bulk-movies.mjs [목표신규=2000]

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
const TARGET = Number(process.argv[2] || 2000);
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("환경변수 누락"); process.exit(1); }

const IMG = "https://image.tmdb.org/t/p";
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GENRE_NAME = {
  28:"액션",12:"모험",16:"애니메이션",35:"코미디",80:"범죄",99:"다큐멘터리",18:"드라마",
  10751:"가족",14:"판타지",36:"역사",27:"공포",10402:"음악",9648:"미스터리",10749:"로맨스",
  878:"SF",53:"스릴러",10752:"전쟁",37:"서부",10770:"TV 영화",
};

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}&language=ko-KR`);
      if (res.status === 429) { await sleep(1500); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(400); }
  }
  return null;
}

function toRow(m) {
  if (!m.poster_path) return null;
  return {
    tmdb_id: m.id,
    title: m.title,
    original_title: m.original_title,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    overview: m.overview ?? "",
    poster_path: `${IMG}/w500${m.poster_path}`,
    backdrop_path: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    genres: (m.genre_ids ?? []).map((g) => GENRE_NAME[g]).filter(Boolean),
    tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    vote_count: m.vote_count ?? 0,
    popularity: m.popularity ?? 0,
  };
}

async function bulkUpsert(rows) {
  if (rows.length === 0) return 0;
  const res = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: { ...sb, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.log("  upsert 오류:", res.status, (await res.text()).slice(0, 120)); return 0; }
  return rows.length;
}

// 적재 소스: [경로템플릿, 최대페이지]
function sources() {
  const s = [];
  // 평점순 (투표 충분)
  for (let p = 1; p <= 30; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=300&include_adult=false&page=${p}`);
  // 인기순
  for (let p = 1; p <= 30; p++) s.push(`/movie/popular?page=${p}`);
  // top_rated
  for (let p = 1; p <= 30; p++) s.push(`/movie/top_rated?page=${p}`);
  // 장르별 평점순 (대표 장르 상위 페이지)
  for (const g of [18,80,53,878,27,35,10749,16,12,9648,37,10752,36,14,99]) {
    for (let p = 1; p <= 8; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=150&with_genres=${g}&include_adult=false&page=${p}`);
  }
  // 언어별 (비영어권 보강)
  for (const lang of ["ko","ja","fr","it","es","zh","de","hi","ru","fa","sv","pt"]) {
    for (let p = 1; p <= 6; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=80&with_original_language=${lang}&include_adult=false&page=${p}`);
  }
  return s;
}

async function main() {
  // 현재 적재된 tmdb_id 집합 (신규 카운트용)
  const seen = new Set();
  let from = 0;
  while (true) {
    const res = await fetch(`${SB_URL}/rest/v1/movies?select=tmdb_id`, {
      headers: { ...sb, Range: `${from}-${from + 999}`, "Range-Unit": "items", Prefer: "count=none" },
    });
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const r of batch) seen.add(r.tmdb_id);
    if (batch.length < 1000) break;
    from += 1000;
  }
  const startCount = seen.size;
  console.log(`현재 적재 ${startCount}편. 목표 신규 ${TARGET}편.\n`);

  const srcs = sources();
  let added = 0;
  let buffer = [];

  for (const path of srcs) {
    if (added >= TARGET) break;
    const data = await tmdb(path);
    const results = data?.results ?? [];
    if (results.length === 0) continue;
    for (const m of results) {
      if (seen.has(m.id)) continue;
      const row = toRow(m);
      if (!row) continue;
      seen.add(m.id);
      buffer.push(row);
      added++;
    }
    // 100편 모이면 flush
    if (buffer.length >= 100) {
      await bulkUpsert(buffer);
      process.stdout.write(`\r적재 신규 ${added}편…   `);
      buffer = [];
    }
    await sleep(40);
  }
  if (buffer.length) await bulkUpsert(buffer);
  console.log(`\n\n완료. 신규 ${added}편 적재 → 총 ${startCount + added}편.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
