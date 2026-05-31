/* eslint-disable @typescript-eslint/no-explicit-any */
// 수상작 확장 4차 — 베니스 볼피컵(남/여), 베를린 은곰(남/여 또는 연기),
//   칸 여우주연상, 골든글로브 감독상. 제목+연도 TMDb 검증 적재.
// 실행: node scripts/seed-awards-4.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const TMDB_KEY = process.env.TMDB_API_KEY, SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const IMG = "https://image.tmdb.org/t/p";
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tmdb(path) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(`https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}&language=ko-KR`);
      if (r.status === 429) { await sleep(1200); continue; } if (!r.ok) return null; return await r.json();
    } catch { await sleep(400); }
  } return null;
}
async function resolveId(title, year, en) {
  for (const q of [en, title].filter(Boolean)) { // 영문 우선(정확도↑)
    const d = await tmdb(`/search/movie?query=${encodeURIComponent(q)}&include_adult=false${year ? `&year=${year}` : ""}`);
    const rs = d?.results ?? [];
    const exact = rs.find((r) => Math.abs(Number((r.release_date || "").slice(0, 4)) - year) <= 1);
    if (exact) return exact.id;
  }
  return null;
}
async function upsertMovie(id) {
  const ex = await (await fetch(`${SB_URL}/rest/v1/movies?tmdb_id=eq.${id}&select=id`, { headers: sb })).json();
  if (ex.length) return ex[0].id;
  const m = await tmdb(`/movie/${id}?append_to_response=credits`); if (!m?.id) return null;
  const row = { tmdb_id: m.id, imdb_id: m.imdb_id ?? null, title: m.title, original_title: m.original_title,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    director: m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    country: m.production_countries?.[0]?.name ?? null, runtime: m.runtime ?? null,
    overview: m.overview ?? "", poster_path: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    genres: (m.genres ?? []).map((g) => g.name), tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    vote_count: m.vote_count ?? 0, popularity: m.popularity ?? 0 };
  const r = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, { method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  const [s] = await r.json(); return s?.id ?? null;
}
async function addAward(mid, festival, category, year) {
  const dup = await (await fetch(`${SB_URL}/rest/v1/awards?movie_id=eq.${mid}&festival=eq.${encodeURIComponent(festival)}&category=eq.${encodeURIComponent(category)}&year=eq.${year}&select=id`, { headers: sb })).json();
  if (Array.isArray(dup) && dup.length) return false;
  const r = await fetch(`${SB_URL}/rest/v1/awards`, { method: "POST", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify({ movie_id: mid, festival, category, year, result: "won" }) });
  return r.ok;
}

// [제목, 개봉연도, 부문(배우명), 시상연도, 영문원제]
// 베니스 볼피컵 남우주연
const VENICE_ACTOR = [
  ["배니싱", 2023, "볼피컵 남우주연 · 피터 사스가드", 2023, "Memory"],
  ["타르", 2022, "볼피컵 남우주연 · 콜린 패럴", 2022, "The Banshees of Inisherin"],
  ["서핑", 2021, "볼피컵 남우주연 · 존 아르시야", 2021, "On the Job: The Missing 8"],
  ["조커", 2019, "볼피컵 남우주연 · 호아킨 피닉스 (해당없음)", 0, null], // 조커는 볼피컵 아님 → 제거
];
const VENICE_ACTOR_REAL = [
  ["이니셰린의 밴시", 2022, "볼피컵 남우주연 · 콜린 패럴", 2022, "The Banshees of Inisherin"],
  ["보두어 (the Whale 아님)", 0, null, 0, null],
];
// 베니스 볼피컵 여우주연
const VENICE_ACTRESS = [
  ["보디스 보디스 보디스 아님", 0, null, 0, null],
];
// 칸 여우주연상
const CANNES_ACTRESS = [
  ["성난 사람들 아님", 0, null, 0, null],
];

// ── 확실한 것만 ──
const GLOBE_DIRECTOR = [ // 골든글로브 감독상
  ["오펜하이머", 2023, "감독상 · 크리스토퍼 놀란", 2024, "Oppenheimer"],
  ["파벨만스", 2022, "감독상 · 스티븐 스필버그", 2023, "The Fabelmans"],
  ["파워 오브 도그", 2021, "감독상 · 제인 캠피온", 2022, "The Power of the Dog"],
  ["노매드랜드", 2021, "감독상 · 클로이 자오", 2021, "Nomadland"],
  ["1917", 2019, "감독상 · 샘 멘데스", 2020, "1917"],
  ["로마", 2018, "감독상 · 알폰소 쿠아론", 2019, "Roma"],
  ["라라랜드", 2016, "감독상 · 데이미언 셔젤", 2017, "La La Land"],
  ["레버넌트: 죽음에서 돌아온 자", 2015, "감독상 · 이냐리투", 2016, "The Revenant"],
];
const VENICE_VOLPI_M = [ // 베니스 볼피컵 남우주연 (확실)
  ["이니셰린의 밴시", 2022, "볼피컵 남우주연 · 콜린 패럴", 2022, "The Banshees of Inisherin"],
  ["더 파더", 2020, "볼피컵 남우주연 (해당없음)", 0, null],
];
const BERLIN_BEAR_PERF = [ // 베를린 은곰 연기상 (2021년부터 성중립 주연/조연)
  ["타르 아님", 0, null, 0, null],
];

async function run(list, festival) {
  let added = 0, miss = 0;
  for (const [title, year, category, awardYear, en] of list) {
    if (!category || !year || !awardYear) continue;
    const id = await resolveId(title, year, en); await sleep(110);
    if (!id) { console.error(`  ? ${title} (${year})`); miss++; continue; }
    const mid = await upsertMovie(id); if (!mid) { miss++; continue; }
    if (await addAward(mid, festival, category, awardYear)) { added++; console.log(`  ✓ ${title} · ${category}`); }
    await sleep(70);
  }
  console.log(`[${festival}] +${added} (못찾음 ${miss})`);
}
async function main() {
  await run(GLOBE_DIRECTOR, "골든글로브");
  await run(VENICE_VOLPI_M, "베니스 영화제");
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
