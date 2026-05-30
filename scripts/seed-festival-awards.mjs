/* eslint-disable @typescript-eslint/no-explicit-any */
// 영화제 수상작 적재 (검증 기반) — 제목+연도로 TMDb 검색해 올바른 tmdb_id 확정 후
//   movies upsert + awards 연결. 추측 ID 미사용 → 오매칭 방지.
//   movies 에 없으면 TMDb 상세로 새로 적재.
// 실행: node scripts/seed-festival-awards.mjs
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

// 제목+개봉연도로 TMDb 영화 id 확정 (연도 ±1 매칭, 영문 원제도 시도)
async function resolveId(title, year, altEn) {
  for (const q of [title, altEn].filter(Boolean)) {
    const d = await tmdb(`/search/movie?query=${encodeURIComponent(q)}&include_adult=false${year ? `&year=${year}` : ""}`);
    const rs = d?.results ?? [];
    if (!rs.length) continue;
    const exact = rs.find((r) => Math.abs(Number((r.release_date || "").slice(0, 4)) - year) <= 1);
    if (exact) return exact.id;
  }
  // 연도 빼고 폭넓게
  const d = await tmdb(`/search/movie?query=${encodeURIComponent(title)}&include_adult=false`);
  const rs = d?.results ?? [];
  const near = rs.find((r) => Math.abs(Number((r.release_date || "").slice(0, 4)) - year) <= 1);
  return near?.id ?? null;
}

async function upsertMovie(id) {
  const ex = await (await fetch(`${SB_URL}/rest/v1/movies?tmdb_id=eq.${id}&select=id`, { headers: sb })).json();
  if (ex.length) return ex[0].id;
  const m = await tmdb(`/movie/${id}?append_to_response=credits`);
  if (!m?.id) return null;
  const row = {
    tmdb_id: m.id, imdb_id: m.imdb_id ?? null, title: m.title, original_title: m.original_title,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    director: m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    country: m.production_countries?.[0]?.name ?? null, runtime: m.runtime ?? null,
    overview: m.overview ?? "", poster_path: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    genres: (m.genres ?? []).map((g) => g.name), tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    vote_count: m.vote_count ?? 0, popularity: m.popularity ?? 0,
  };
  const r = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) });
  const [s] = await r.json(); return s?.id ?? null;
}

async function addAward(mid, festival, category, year, result) {
  const dup = await (await fetch(`${SB_URL}/rest/v1/awards?movie_id=eq.${mid}&festival=eq.${encodeURIComponent(festival)}&category=eq.${encodeURIComponent(category)}&year=eq.${year}&select=id`, { headers: sb })).json();
  if (Array.isArray(dup) && dup.length) return false;
  const r = await fetch(`${SB_URL}/rest/v1/awards`, {
    method: "POST", headers: { ...sb, Prefer: "return=minimal" },
    body: JSON.stringify({ movie_id: mid, festival, category, year, result }) });
  return r.ok;
}

// ── 데이터: [제목, 개봉연도, 영문원제(검색보조)] ──
// 칸 황금종려상 (시상연도 기준; 영화 개봉연도로 검색)
const CANNES = [
  ["기생충", 2019, "Parasite"], ["어느 가족", 2018, "Shoplifters"], ["더 스퀘어", 2017, "The Square"],
  ["나, 다니엘 블레이크", 2016, "I, Daniel Blake"], ["디판", 2015, "Dheepan"],
  ["윈터 슬립", 2014, "Winter Sleep"], ["가장 따뜻한 색, 블루", 2013, "Blue Is the Warmest Colour"],
  ["아무르", 2012, "Amour"], ["트리 오브 라이프", 2011, "The Tree of Life"],
  ["엉클 분미", 2010, "Uncle Boonmee Who Can Recall His Past Lives"],
  ["하얀 리본", 2009, "The White Ribbon"], ["더 클래스", 2008, "The Class"],
  ["4개월, 3주... 그리고 2일", 2007, "4 Months, 3 Weeks and 2 Days"],
  ["바람이 분다", 2006, "The Wind That Shakes the Barley"],
  ["엘리펀트", 2003, "Elephant"], ["피아니스트", 2002, "The Pianist"],
  ["펄프 픽션", 1994, "Pulp Fiction"], ["피아노", 1993, "The Piano"],
  ["택시 드라이버", 1976, "Taxi Driver"], ["지옥의 묵시록", 1979, "Apocalypse Now"],
];

// 오스카 작품상 (수상연도; 영화 개봉연도로 검색)
const OSCAR_BP = [
  ["기생충", 2019, "Parasite"], ["그린 북", 2018, "Green Book"], ["셰이프 오브 워터: 사랑의 모양", 2017, "The Shape of Water"],
  ["문라이트", 2016, "Moonlight"], ["스포트라이트", 2015, "Spotlight"], ["버드맨", 2014, "Birdman"],
  ["노예 12년", 2013, "12 Years a Slave"], ["아르고", 2012, "Argo"], ["아티스트", 2011, "The Artist"],
  ["킹스 스피치", 2010, "The King's Speech"], ["허트 로커", 2008, "The Hurt Locker"],
  ["슬럼독 밀리어네어", 2008, "Slumdog Millionaire"], ["노인을 위한 나라는 없다", 2007, "No Country for Old Men"],
  ["디파티드", 2006, "The Departed"], ["밀리언 달러 베이비", 2004, "Million Dollar Baby"],
  ["반지의 제왕: 왕의 귀환", 2003, "The Lord of the Rings: The Return of the King"],
  ["시카고", 2002, "Chicago"], ["뷰티풀 마인드", 2001, "A Beautiful Mind"], ["글래디에이터", 2000, "Gladiator"],
  ["아메리칸 뷰티", 1999, "American Beauty"], ["타이타닉", 1997, "Titanic"], ["브레이브하트", 1995, "Braveheart"],
  ["포레스트 검프", 1994, "Forrest Gump"], ["쉰들러 리스트", 1993, "Schindler's List"],
  ["양들의 침묵", 1991, "The Silence of the Lambs"], ["늑대와 춤을", 1990, "Dances with Wolves"],
  ["대부", 1972, "The Godfather"], ["대부 2", 1974, "The Godfather Part II"],
];

// 베니스 황금사자상
const VENICE = [
  ["가여운 것들", 2023, "Poor Things"], ["다 메인 인 더 다크 (올 더 뷰티 앤 더 블러드셰드)", 2022, "All the Beauty and the Bloodshed"],
  ["오드리 디아완 레벤느망", 2021, "Happening"], ["노매드랜드", 2020, "Nomadland"], ["조커", 2019, "Joker"],
  ["로마", 2018, "Roma"], ["셰이프 오브 워터: 사랑의 모양", 2017, "The Shape of Water"],
  ["프롬 어파", 2015, "From Afar"], ["로마 환상곡 (성스러운 도로)", 2013, "Sacro GRA"],
  ["피에타", 2012, "Pieta"], ["파우스트", 2011, "Faust"], ["썸웨어", 2010, "Somewhere"],
  ["레바논", 2009, "Lebanon"], ["브로크백 마운틴", 2005, "Brokeback Mountain"],
];

// 베를린 황금곰상
const BERLIN = [
  ["다호메이", 2024, "Dahomey"], ["우연과 상상 아님 — 온 디 애덤스", 2023, "On the Adamant"],
  ["알카라스", 2022, "Alcarras"], ["배드 럭 뱅잉", 2021, "Bad Luck Banging or Loony Porn"],
  ["사탄은 없다", 2020, "There Is No Evil"], ["시노님즈", 2019, "Synonyms"],
  ["터치 미 낫", 2018, "Touch Me Not"], ["몸과 영혼에 대하여", 2017, "On Body and Soul"],
  ["화염의 바다", 2016, "Fire at Sea"], ["택시", 2015, "Taxi"], ["피크닉", 2014, "Black Coal, Thin Ice"],
  ["포지션의 아이", 2013, "Child's Pose"], ["시저는 죽어야 한다", 2012, "Caesar Must Die"],
  ["씨민과 나데르의 별거", 2011, "A Separation"],
];

async function processList(list, festival, category) {
  let added = 0, miss = 0;
  for (const [title, year, en] of list) {
    const id = await resolveId(title, year, en);
    await sleep(120);
    if (!id) { console.error(`  ? ${title} (${year}) — TMDb 못 찾음`); miss++; continue; }
    const mid = await upsertMovie(id);
    if (!mid) { miss++; continue; }
    const ok = await addAward(mid, festival, category, year, "won");
    if (ok) added++;
    await sleep(80);
  }
  console.log(`[${festival} ${category}] ${added}건 추가 (못찾음 ${miss})`);
}

async function main() {
  await processList(CANNES, "칸 영화제", "황금종려상");
  await processList(OSCAR_BP, "아카데미", "작품상");
  await processList(VENICE, "베니스 영화제", "황금사자상");
  await processList(BERLIN, "베를린 영화제", "황금곰상");
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
