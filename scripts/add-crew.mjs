/* eslint-disable @typescript-eslint/no-explicit-any */
// 촬영감독전·작곡가전 큐레이션 추가 (crew job 기반).
//   slug: dop-* (촬영감독), composer-* (작곡가)
// 실행: node scripts/add-crew.mjs [편수=10]

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
const PER = Number(process.argv[2] || 10);
if (!TMDB_KEY || !SB_URL || !SB_KEY) { console.error("환경변수 누락"); process.exit(1); }

const IMG = "https://image.tmdb.org/t/p";
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}&language=ko-KR`);
      if (res.status === 429) { await sleep(2000); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(500); }
  }
  return null;
}

// [slug, 표시제목, 검색어, 설명, job 매칭(부분일치)]
const CREW = [
  // 촬영감독
  ["dop-deakins", "로저 디킨스", "Roger Deakins", "빛의 시인. 코엔·빌뇌브의 화면을 만든 촬영감독.", "Director of Photography"],
  ["dop-lubezki", "에마누엘 루베스키", "Emmanuel Lubezki", "자연광과 롱테이크의 마법. 세 번의 아카데미 촬영상.", "Director of Photography"],
  ["dop-doyle", "크리스토퍼 도일", "Christopher Doyle", "왕가위의 색과 흔들림. 홍콩 영화의 질감.", "Director of Photography"],
  ["dop-storaro", "비토리오 스토라로", "Vittorio Storaro", "색채의 화가. 코폴라·베르톨루치의 빛.", "Director of Photography"],
  ["dop-chung", "정정훈", "정정훈", "박찬욱의 화면. 헐리우드까지 진출한 촬영감독.", "Director of Photography"],
  // 작곡가
  ["composer-morricone", "엔니오 모리코네", "Ennio Morricone", "세르지오 레오네의 선율. 영화음악의 거장.", "Original Music Composer"],
  ["composer-williams", "존 윌리엄스", "John Williams", "스필버그의 동반자. 가장 사랑받는 영화음악.", "Original Music Composer"],
  ["composer-zimmer", "한스 짐머", "Hans Zimmer", "놀란의 굉음. 동시대 블록버스터의 소리.", "Original Music Composer"],
  ["composer-shore", "하워드 쇼어", "Howard Shore", "반지의 제왕의 장대한 세계. 크로넨버그의 동반자.", "Original Music Composer"],
  ["composer-desplat", "알렉상드르 데스플라", "Alexandre Desplat", "섬세한 선율. 웨스 앤더슨의 음악.", "Original Music Composer"],
  ["composer-greenwood", "조니 그린우드", "Jonny Greenwood", "라디오헤드를 넘어. PTA의 불안한 음악.", "Original Music Composer"],
];

async function upsertMovie(id) {
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
  };
  const res = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) return null;
  const [s] = await res.json(); return s.id;
}

async function crewFilms(query, jobMatch) {
  const p = await tmdb(`/search/person?query=${encodeURIComponent(query)}`);
  const results = p?.results ?? [];
  // 동명이인 회피: 직무 부서(Camera/Sound/Crew/Directing)인 인물 우선
  const dept = jobMatch.includes("Photography") ? "Camera" : "Sound";
  const person =
    results.find((r) => r.known_for_department === dept) ??
    results.find((r) => r.known_for_department === "Crew") ??
    results[0];
  if (!person) return [];
  const c = await tmdb(`/person/${person.id}/movie_credits`);
  const films = (c?.crew ?? [])
    .filter((x) => (x.job || "").includes(jobMatch) && x.release_date && (x.vote_count ?? 0) >= 50 && x.poster_path)
    .reduce((a, x) => { if (!a.some((y) => y.id === x.id)) a.push(x); return a; }, []);
  films.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const pool = films.slice(0, Math.max(PER + 8, 18));
  pool.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return pool.slice(0, PER).map((m) => m.id);
}

async function main() {
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=slug,sort_order`, { headers: sb });
  const rows = await r.json();
  const have = new Set(rows.map((c) => c.slug));
  let max = rows.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

  for (const [slug, title, query, desc, job] of CREW) {
    if (have.has(slug)) { console.log(`= ${title} (이미 있음)`); continue; }
    const ids = await crewFilms(query, job);
    if (ids.length < 3) { console.log(`✗ ${title} (${ids.length}편, 스킵)`); continue; }
    const suffix = slug.startsWith("dop-") ? "촬영작" : "음악작";
    const cr = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
      method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ slug, title: `${title} ${suffix}`, description: desc, sort_order: ++max }),
    });
    const [cur] = await cr.json(); let pos = 1;
    for (const fid of ids) {
      const mid = await upsertMovie(fid); if (!mid) continue;
      await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
        method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ curation_id: cur.id, movie_id: mid, position: pos++ }),
      });
    }
    console.log(`✓ ${title} ${suffix} (${ids.length}편)`);
    await sleep(120);
  }
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
