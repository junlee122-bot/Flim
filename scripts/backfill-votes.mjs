/* eslint-disable @typescript-eslint/no-explicit-any */
// vote_count / popularity 백필 — 기존 적재 영화에 투표수·인기도를 채운다.
//   discover/popular/top_rated/장르/언어 소스를 다시 긁어 upsert(기존 행도 갱신).
//   tmdb_rating 도 함께 갱신. 멱등.
// 실행: node scripts/backfill-votes.mjs

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

const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// 같은 소스 집합 (bulk-movies 와 동일) — 여기 등장하는 모든 영화의 vote_count 갱신
function sources() {
  const s = [];
  for (let p = 1; p <= 30; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=300&include_adult=false&page=${p}`);
  for (let p = 1; p <= 30; p++) s.push(`/movie/popular?page=${p}`);
  for (let p = 1; p <= 30; p++) s.push(`/movie/top_rated?page=${p}`);
  for (const g of [18,80,53,878,27,35,10749,16,12,9648,37,10752,36,14,99]) {
    for (let p = 1; p <= 8; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=150&with_genres=${g}&include_adult=false&page=${p}`);
  }
  for (const lang of ["ko","ja","fr","it","es","zh","de","hi","ru","fa","sv","pt"]) {
    for (let p = 1; p <= 6; p++) s.push(`/discover/movie?sort_by=vote_average.desc&vote_count.gte=80&with_original_language=${lang}&include_adult=false&page=${p}`);
  }
  return s;
}

// 부분 업데이트: tmdb_id 기준으로 vote_count/popularity/tmdb_rating PATCH
async function patchVotes(updates) {
  // updates: [{tmdb_id, vote_count, popularity, tmdb_rating}]
  // PostgREST 는 단일 PATCH 로 다중 행 서로 다른 값 갱신이 안 되므로 upsert 사용.
  const res = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: { ...sb, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) { console.log("  오류:", res.status, (await res.text()).slice(0, 120)); return 0; }
  return updates.length;
}

async function main() {
  const srcs = sources();
  const seen = new Set();
  let buffer = [];
  let touched = 0;

  for (const path of srcs) {
    const data = await tmdb(path);
    for (const m of data?.results ?? []) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      // upsert 시 NOT NULL(title 등) 필요 → 최소 필드 포함
      buffer.push({
        tmdb_id: m.id,
        title: m.title,
        original_title: m.original_title,
        vote_count: m.vote_count ?? 0,
        popularity: m.popularity ?? 0,
        tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
      });
      touched++;
    }
    if (buffer.length >= 100) {
      await patchVotes(buffer);
      process.stdout.write(`\r갱신 ${touched}편…   `);
      buffer = [];
    }
    await sleep(40);
  }
  if (buffer.length) await patchVotes(buffer);
  console.log(`\n완료. ${touched}편의 vote_count/popularity 갱신.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
