/* eslint-disable @typescript-eslint/no-explicit-any */
// TV 시리즈 대량 적재 — TMDb popular/top_rated/장르별 → series bulk upsert. 멱등.
// 실행: node scripts/bulk-series.mjs [목표신규=1000]
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const TMDB_KEY = process.env.TMDB_API_KEY, SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET = Number(process.argv[2] || 1000);
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const IMG = "https://image.tmdb.org/t/p";
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GN = { 16:"애니메이션",35:"코미디",80:"범죄",99:"다큐멘터리",18:"드라마",10751:"가족",10759:"액션&어드벤처",
  9648:"미스터리",10765:"SF&판타지",10768:"전쟁&정치",37:"서부",10762:"키즈",10763:"뉴스",10764:"리얼리티",10766:"연속극",10767:"토크" };

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(`https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}&language=ko-KR`);
      if (r.status === 429) { await sleep(1500); continue; } if (!r.ok) return null; return await r.json();
    } catch { await sleep(400); }
  } return null;
}
function toRow(t) {
  if (!t.poster_path) return null;
  return { tmdb_id: t.id, name: t.name, original_name: t.original_name,
    first_air_year: t.first_air_date ? Number(t.first_air_date.slice(0,4)) : null,
    overview: t.overview ?? "", poster_path: `${IMG}/w500${t.poster_path}`,
    backdrop_path: t.backdrop_path ? `${IMG}/w1280${t.backdrop_path}` : null,
    genres: (t.genre_ids ?? []).map((g) => GN[g]).filter(Boolean),
    country: t.origin_country?.[0] ?? null,
    tmdb_rating: t.vote_average ? Math.round(t.vote_average*10)/10 : null,
    vote_count: t.vote_count ?? 0, popularity: t.popularity ?? 0 };
}
async function bulk(rows) {
  if (!rows.length) return 0;
  const r = await fetch(`${SB_URL}/rest/v1/series?on_conflict=tmdb_id`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
  if (!r.ok) { console.log("upsert 오류", r.status, (await r.text()).slice(0,120)); return 0; } return rows.length;
}
function sources() {
  const s = [];
  for (let p=1;p<=25;p++) s.push(`/tv/top_rated?page=${p}`);
  for (let p=1;p<=25;p++) s.push(`/tv/popular?page=${p}`);
  for (const g of [18,80,9648,10765,16,35,99,10759,10768]) for (let p=1;p<=8;p++)
    s.push(`/discover/tv?sort_by=vote_average.desc&vote_count.gte=100&with_genres=${g}&page=${p}`);
  for (const lang of ["ko","ja","en","es"]) for (let p=1;p<=6;p++)
    s.push(`/discover/tv?sort_by=vote_average.desc&vote_count.gte=50&with_original_language=${lang}&page=${p}`);
  return s;
}
async function main() {
  const seen = new Set(); let from = 0;
  while (true) {
    const r = await fetch(`${SB_URL}/rest/v1/series?select=tmdb_id`, { headers: { ...sb, Range: `${from}-${from+999}`, "Range-Unit": "items" } });
    const b = await r.json(); if (!Array.isArray(b) || !b.length) break; for (const x of b) seen.add(x.tmdb_id); if (b.length<1000) break; from+=1000;
  }
  console.log(`현재 ${seen.size}편. 목표 신규 ${TARGET}.`);
  let added = 0, buf = [];
  for (const path of sources()) {
    if (added >= TARGET) break;
    const d = await tmdb(path);
    for (const t of d?.results ?? []) { if (seen.has(t.id)) continue; const row = toRow(t); if (!row) continue; seen.add(t.id); buf.push(row); added++; }
    if (buf.length >= 100) { await bulk(buf); process.stdout.write(`\r적재 ${added}…  `); buf = []; }
    await sleep(40);
  }
  if (buf.length) await bulk(buf);
  console.log(`\n완료. 신규 ${added}편 → 총 ${seen.size}편.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
