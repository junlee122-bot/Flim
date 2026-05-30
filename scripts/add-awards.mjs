/* eslint-disable @typescript-eslint/no-explicit-any */
// 주요 수상 정보 시드 — 오스카 작품상·칸 황금종려상 등 대표 수상작.
//   영화가 movies 에 있으면(tmdb_id) 거기에 수상 정보 연결. 없으면 스킵.
//   중복 방지: 같은 영화+영화제+부문+연도 이미 있으면 건너뜀.
// 실행: node scripts/add-awards.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// [tmdb_id, 영화제, 부문, 연도, won/nominated]
// 사실 확인된 대표 수상만 (추측 제외).
const AWARDS = [
  // ── 아카데미 작품상 수상작 ──
  [496243, "아카데미", "작품상", 2020, "won"],     // 기생충
  [496243, "아카데미", "감독상", 2020, "won"],     // 봉준호
  [376867, "아카데미", "작품상", 2017, "won"],     // 문라이트
  [157336, "아카데미", "시각효과상", 2015, "won"], // 인터스텔라
  [155, "아카데미", "남우조연상", 2009, "won"],    // 다크 나이트 — 히스 레저
  [122, "아카데미", "작품상", 2004, "won"],        // 반지의 제왕: 왕의 귀환 (11관왕)
  [424, "아카데미", "작품상", 1994, "won"],        // 쉰들러 리스트
  [238, "아카데미", "작품상", 1973, "won"],        // 대부
  [240, "아카데미", "작품상", 1975, "won"],        // 대부 2
  // ── 칸 황금종려상 ──
  [496243, "칸 영화제", "황금종려상", 2019, "won"], // 기생충
  [86837, "칸 영화제", "황금종려상", 2012, "won"],  // 아무르
  [2009, "칸 영화제", "황금종려상", 2007, "won"],   // 4개월 3주 그리고 2일
  [680, "칸 영화제", "황금종려상", 1994, "won"],    // 펄프 픽션
];

async function main() {
  let added = 0, skipped = 0;
  for (const [tmdb, festival, category, year, result] of AWARDS) {
    if (!festival) { skipped++; continue; }
    const mv = await (await fetch(`${SB_URL}/rest/v1/movies?tmdb_id=eq.${tmdb}&select=id,title`, { headers: sb })).json();
    if (!mv.length) { console.log(`- tmdb ${tmdb}: movies 없음`); skipped++; continue; }
    const mid = mv[0].id;
    // 중복 체크
    const dup = await (await fetch(`${SB_URL}/rest/v1/awards?movie_id=eq.${mid}&festival=eq.${encodeURIComponent(festival)}&category=eq.${encodeURIComponent(category)}&select=id`, { headers: sb })).json();
    if (Array.isArray(dup) && dup.length) { skipped++; continue; }
    const res = await fetch(`${SB_URL}/rest/v1/awards`, {
      method: "POST", headers: { ...sb, Prefer: "return=minimal" },
      body: JSON.stringify({ movie_id: mid, festival, category, year, result }) });
    if (res.ok) { added++; console.log(`✓ ${mv[0].title} · ${festival} ${category} (${result})`); }
  }
  console.log(`\n완료. ${added}건 추가, ${skipped}건 스킵.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
