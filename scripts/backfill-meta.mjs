/* eslint-disable @typescript-eslint/no-explicit-any */
// 메타데이터 백필 — 감독/줄거리/국가/러닝타임이 비어있는 영화를 TMDb 로 채운다.
//   bulk-movies 로 적재된 영화는 감독 등이 없으므로 상세 호출로 보강.
// 실행: node scripts/backfill-meta.mjs [최대=4000]
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const TMDB_KEY = process.env.TMDB_API_KEY, SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const MAX = Number(process.argv[2] || 4000);
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(`https://api.themoviedb.org/3${path}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits`);
      if (r.status === 429) { await sleep(1200); continue; } if (!r.ok) return null; return await r.json();
    } catch { await sleep(400); }
  } return null;
}

async function main() {
  // 감독 또는 줄거리가 비어있는 영화 (포스터 있는 것 우선)
  const rows = [];
  let from = 0;
  while (rows.length < MAX) {
    const r = await fetch(
      `${SB_URL}/rest/v1/movies?select=id,tmdb_id&or=(director.is.null,overview.is.null,overview.eq.)&poster_path=not.is.null&order=vote_count.desc`,
      { headers: { ...sb, Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
    const b = await r.json(); if (!Array.isArray(b) || !b.length) break;
    rows.push(...b); if (b.length < 1000) break; from += 1000;
  }
  const todo = rows.slice(0, MAX);
  console.log(`보강 대상 ${todo.length}편.`);
  let done = 0, fixed = 0;
  for (const row of todo) {
    const m = await tmdb(`/movie/${row.tmdb_id}`);
    done++;
    if (m?.id) {
      const patch = {
        director: m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
        country: m.production_countries?.[0]?.name ?? null,
        runtime: m.runtime ?? null,
        overview: m.overview ?? "",
        imdb_id: m.imdb_id ?? null,
      };
      const res = await fetch(`${SB_URL}/rest/v1/movies?id=eq.${row.id}`, {
        method: "PATCH", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify(patch) });
      if (res.ok) fixed++;
    }
    if (done % 50 === 0) process.stdout.write(`\r보강 ${done}/${todo.length} (성공 ${fixed})  `);
    await sleep(60);
  }
  console.log(`\n완료. ${fixed}편 보강.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
