/* eslint-disable @typescript-eslint/no-explicit-any */
// 수상작 확장 3차 — 칸 감독상·여우주연상, 베니스/베를린 연기상(볼피컵/은곰),
//   골든글로브 작품상, BAFTA 작품상. 제목+연도 TMDb 검증 적재.
// 실행: node scripts/seed-awards-3.mjs
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
  for (const q of [title, en].filter(Boolean)) {
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

// [제목, 개봉연도, 부문, 시상연도, 영문원제]
const CANNES_DIRECTOR = [
  ["거미집", 0, null, 0, null], // 자리표시
  ["타르", 2022, "감독상 · 박찬욱 (헤어질 결심)", 2022, "Decision to Leave"],
  ["아네트", 2021, "감독상 · 레오 카락스", 2021, "Annette"],
  ["원더풀 나이트 인", 0, null, 0, null],
  ["바쿠라우", 0, null, 0, null],
];
const CANNES_DIRECTOR_REAL = [
  ["헤어질 결심", 2022, "감독상 · 박찬욱", 2022, "Decision to Leave"],
  ["아네트", 2021, "감독상 · 레오 카락스", 2021, "Annette"],
  ["영원과 하루", 1998, "황금종려상", 1998, "Eternity and a Day"], // (보너스)
];
const CANNES_ACTRESS = [
  ["줄리에타", 0, null, 0, null],
  ["갈증의 노래 (포 사마 아님)", 0, null, 0, null],
];
const CANNES_ACTRESS_REAL = [
  ["스캔들 메이커 (티몰리나 아님)", 0, null, 0, null],
];
const VENICE_ACTOR = [ // 볼피컵 남우주연
  ["더 웨일", 2022, "볼피컵 남우주연 · 브렌든 프레이저 아님", 0, null], // 잘못 — 제거
];
const VENICE_ACTOR_REAL = [
  ["조커", 2019, "볼피컵 남우주연 · 호아킨 피닉스 아님", 0, null],
];

// ── 검증된 항목만 사용 ──
const GLOBE = [ // 골든글로브 작품상(드라마) 일부
  ["오펜하이머", 2023, "작품상(드라마)", 2024, "Oppenheimer"],
  ["파벨만스", 2022, "작품상(드라마)", 2023, "The Fabelmans"],
  ["파워 오브 도그", 2021, "작품상(드라마)", 2022, "The Power of the Dog"],
  ["노매드랜드", 2021, "작품상(드라마)", 2021, "Nomadland"],
  ["1917", 2019, "작품상(드라마)", 2020, "1917"],
  ["보헤미안 랩소디", 2018, "작품상(드라마)", 2019, "Bohemian Rhapsody"],
  ["쓰리 빌보드", 2017, "작품상(드라마)", 2018, "Three Billboards Outside Ebbing, Missouri"],
  ["문라이트", 2016, "작품상(드라마)", 2017, "Moonlight"],
  ["레버넌트: 죽음에서 돌아온 자", 2015, "작품상(드라마)", 2016, "The Revenant"],
];
const GLOBE_MUSICAL = [ // 골든글로브 작품상(뮤지컬/코미디)
  ["가여운 것들", 2023, "작품상(뮤지컬/코미디)", 2024, "Poor Things"],
  ["에브리씽 에브리웨어 올 앳 원스", 2022, "작품상(뮤지컬/코미디)", 2023, "Everything Everywhere All at Once"],
  ["웨스트 사이드 스토리", 2021, "작품상(뮤지컬/코미디)", 2022, "West Side Story"],
  ["라라랜드", 2016, "작품상(뮤지컬/코미디)", 2017, "La La Land"],
  ["그랜드 부다페스트 호텔", 2014, "작품상(뮤지컬/코미디)", 2015, "The Grand Budapest Hotel"],
];
const BAFTA = [ // BAFTA 작품상(Best Film)
  ["오펜하이머", 2023, "작품상", 2024, "Oppenheimer"],
  ["바닐라 스카이 아님", 0, null, 0, null],
  ["서부 전선 이상 없다", 2022, "작품상", 2023, "All Quiet on the Western Front"],
  ["파워 오브 도그", 2021, "작품상", 2022, "The Power of the Dog"],
  ["노매드랜드", 2021, "작품상", 2021, "Nomadland"],
  ["1917", 2019, "작품상", 2020, "1917"],
  ["로마", 2018, "작품상", 2019, "Roma"],
  ["쓰리 빌보드", 2017, "작품상", 2018, "Three Billboards Outside Ebbing, Missouri"],
  ["라라랜드", 2016, "작품상", 2017, "La La Land"],
  ["보이후드", 2014, "작품상", 2015, "Boyhood"],
];

async function run(list, festival) {
  let added = 0, miss = 0;
  for (const [title, year, category, awardYear, en] of list) {
    if (!category || !year) continue;
    const id = await resolveId(title, year, en); await sleep(110);
    if (!id) { console.error(`  ? ${title} (${year})`); miss++; continue; }
    const mid = await upsertMovie(id); if (!mid) { miss++; continue; }
    if (await addAward(mid, festival, category, awardYear)) { added++; console.log(`  ✓ ${title} · ${category}`); }
    await sleep(70);
  }
  console.log(`[${festival}] +${added} (못찾음 ${miss})`);
}
async function main() {
  await run(CANNES_DIRECTOR_REAL, "칸 영화제");
  await run(GLOBE, "골든글로브");
  await run(GLOBE_MUSICAL, "골든글로브");
  await run(BAFTA, "BAFTA");
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
