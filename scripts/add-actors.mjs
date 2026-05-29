/* eslint-disable @typescript-eslint/no-explicit-any */
// 배우전 큐레이션 추가 — 각 배우의 대표 출연작(평점/투표수 상위)을 모은다.
//   slug 는 actor-* 로 시작 (카테고리 분류용).
// 실행: node scripts/add-actors.mjs [편수=10]

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

// [slug, 제목, 검색어, 설명]
const ACTORS = [
  ["actor-song-kang-ho", "송강호", "송강호", "한국 영화의 얼굴. 봉준호·박찬욱이 신뢰한 배우."],
  ["actor-choi-min-sik", "최민식", "최민식", "압도적 존재감. 올드보이의 그 얼굴."],
  ["actor-jeon-do-yeon", "전도연", "전도연", "칸이 인정한 배우. 감정의 깊이."],
  ["actor-toni-servillo", "토니 세르빌로", "Toni Servillo", "이탈리아 현대 영화의 중심. 소렌티노의 페르소나."],
  ["actor-denzel", "덴절 워싱턴", "Denzel Washington", "강렬한 카리스마. 미국 영화의 거목."],
  ["actor-meryl-streep", "메릴 스트립", "Meryl Streep", "변신의 화신. 연기의 교과서."],
  ["actor-daniel-day-lewis", "다니엘 데이 루이스", "Daniel Day-Lewis", "메소드의 극한. 세 번의 아카데미."],
  ["actor-joaquin", "호아킨 피닉스", "Joaquin Phoenix", "위태롭고 강렬한. 동시대 최고의 배우."],
  ["actor-cate-blanchett", "케이트 블란쳇", "Cate Blanchett", "우아함과 광기를 오가는 카멜레온."],
  ["actor-tom-hanks", "톰 행크스", "Tom Hanks", "미국의 양심. 가장 사랑받는 배우."],
  ["actor-leonardo", "레오나르도 디카프리오", "Leonardo DiCaprio", "스코세이지의 뮤즈. 시대의 아이콘."],
  ["actor-frances", "프란시스 맥도먼드", "Frances McDormand", "꾸밈없는 진실의 연기. 코엔의 페르소나."],
  ["actor-mads", "매즈 미켈센", "Mads Mikkelsen", "북유럽의 강렬한 얼굴. 깊이 있는 악역과 주인공."],
  ["actor-tilda", "틸다 스윈튼", "Tilda Swinton", "경계를 넘나드는 예술가. 독보적 존재."],
  ["actor-maggie-cheung", "장만옥", "장만옥", "화양연화의 그 우아함. 홍콩 영화의 뮤즈."],
  ["actor-tony-leung", "양조위", "양조위", "눈빛만으로 말하는 배우. 왕가위의 페르소나."],
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

async function actorFilms(query) {
  const p = await tmdb(`/search/person?query=${encodeURIComponent(query)}`);
  const person = p?.results?.find((r) => r.known_for_department === "Acting") ?? p?.results?.[0];
  if (!person) return [];
  const c = await tmdb(`/person/${person.id}/movie_credits`);
  const acted = (c?.cast ?? [])
    .filter((x) => x.release_date && (x.vote_count ?? 0) >= 50 && x.poster_path)
    .reduce((a, x) => { if (!a.some((y) => y.id === x.id)) a.push(x); return a; }, []);
  acted.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const pool = acted.slice(0, Math.max(PER + 8, 18));
  pool.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return pool.slice(0, PER).map((m) => m.id);
}

async function main() {
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=slug,sort_order`, { headers: sb });
  const rows = await r.json();
  const have = new Set(rows.map((c) => c.slug));
  let max = rows.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

  for (const [slug, title, query, desc] of ACTORS) {
    if (have.has(slug)) { console.log(`= ${title} (이미 있음)`); continue; }
    const ids = await actorFilms(query);
    if (ids.length < 3) { console.log(`✗ ${title} (영화 ${ids.length}편, 스킵)`); continue; }
    const cr = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
      method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ slug, title: `${title} 출연작`, description: desc, sort_order: ++max }),
    });
    const [cur] = await cr.json(); let pos = 1;
    for (const fid of ids) {
      const mid = await upsertMovie(fid); if (!mid) continue;
      await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
        method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ curation_id: cur.id, movie_id: mid, position: pos++ }),
      });
    }
    console.log(`✓ ${title} 출연작 (${ids.length}편)`);
    await sleep(120);
  }
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
