/* eslint-disable @typescript-eslint/no-explicit-any */
// 감독전 큐레이션을 더 깊게 — 각 감독전을 최대 TARGET_PER 편까지 채운다.
//   slug → 감독명(query) 매핑으로 person 검색 → 그 감독의 작품을 더 끌어와 추가.
//   이미 담긴 영화는 건너뛴다(멱등).
//
// 실행: node scripts/expand-directors.mjs [편수=10]

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
const TARGET_PER = Number(process.argv[2] || 10);
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

// slug → 감독 검색어 (한국어 표기 우선 — 영어는 동명이인 오매칭 위험)
const DIR = {
  fellini:"Federico Fellini", godard:"Jean-Luc Godard", truffaut:"François Truffaut",
  antonioni:"Michelangelo Antonioni", bergman:"Ingmar Bergman", kurosawa:"구로사와 아키라",
  ozu:"오즈 야스지로", mizoguchi:"미조구치 겐지", "kore-eda":"고레에다 히로카즈",
  miyazaki:"미야자키 하야오", hou:"허우 샤오시엔", "edward-yang":"에드워드 양",
  "wong-kar-wai":"왕가위", "zhang-yimou":"장이머우", hitchcock:"Alfred Hitchcock",
  scorsese:"Martin Scorsese", coppola:"Francis Ford Coppola", spielberg:"Steven Spielberg",
  tarantino:"Quentin Tarantino", pta:"Paul Thomas Anderson", fincher:"David Fincher",
  lynch:"David Lynch", malick:"Terrence Malick", "wes-anderson":"Wes Anderson",
  nolan:"Christopher Nolan", villeneuve:"Denis Villeneuve", cuaron:"Alfonso Cuarón",
  "del-toro":"Guillermo del Toro", almodovar:"Pedro Almodóvar", "von-trier":"Lars von Trier",
  haneke:"Michael Haneke", kieslowski:"Krzysztof Kieślowski", kiarostami:"Abbas Kiarostami",
  polanski:"Roman Polanski", "lee-chang-dong":"이창동", "hong-sang-soo":"홍상수",
  lanthimos:"Yorgos Lanthimos", "greta-gerwig":"Greta Gerwig", "spike-lee":"Spike Lee",
  chaplin:"Charlie Chaplin", welles:"Orson Welles", "billy-wilder":"Billy Wilder",
  leone:"Sergio Leone", denis:"Claire Denis", varda:"Agnès Varda", "jia-zhangke":"지아장커",
  kitano:"기타노 다케시", refn:"Nicolas Winding Refn", aronofsky:"Darren Aronofsky",
  "bong-joon-ho":"봉준호", "park-chan-wook":"박찬욱", kubrick:"Stanley Kubrick",
  tarkovsky:"Andrei Tarkovsky",
};

async function directorFilms(query, limit) {
  const p = await tmdb(`/search/person?query=${encodeURIComponent(query)}`);
  const person = p?.results?.find((r) => r.known_for_department === "Directing") ?? p?.results?.[0];
  if (!person) return [];
  const c = await tmdb(`/person/${person.id}/movie_credits`);
  const d = (c?.crew ?? [])
    .filter((x) => x.job === "Director" && x.release_date && (x.vote_count ?? 0) >= 15 && x.poster_path)
    .reduce((a, x) => { if (!a.some((y) => y.id === x.id)) a.push(x); return a; }, []);
  // 대표작(투표수) 상위 풀에서 평점순
  d.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const pool = d.slice(0, Math.max(limit + 6, 16));
  pool.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return pool.slice(0, limit).map((m) => m.id);
}

async function upsertMovie(tmdbId) {
  const m = await tmdb(`/movie/${tmdbId}?append_to_response=credits`);
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
  const [s] = await res.json();
  return s.id;
}

async function main() {
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=id,slug,title&order=sort_order`, { headers: sb });
  const curations = await r.json();
  let totalAdded = 0;

  for (const c of curations) {
    const query = DIR[c.slug];
    if (!query) continue; // 감독전이 아니면 스킵

    const cm = await fetch(`${SB_URL}/rest/v1/curation_movies?curation_id=eq.${c.id}&select=position,movies(tmdb_id)`, { headers: sb });
    const rows = await cm.json();
    const have = new Set(rows.map((x) => x.movies?.tmdb_id).filter(Boolean));
    let pos = rows.reduce((m, x) => Math.max(m, x.position ?? 0), 0);
    if (have.size >= TARGET_PER) continue;

    const ids = await directorFilms(query, TARGET_PER);
    let added = 0;
    for (const tmdbId of ids) {
      if (have.size >= TARGET_PER) break;
      if (have.has(tmdbId)) continue;
      const mid = await upsertMovie(tmdbId);
      if (!mid) continue;
      const link = await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
        method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ curation_id: c.id, movie_id: mid, position: ++pos }),
      });
      if (link.ok) { have.add(tmdbId); added++; totalAdded++; }
    }
    if (added > 0) console.log(`  + ${c.title}: +${added}편 (총 ${have.size})`);
    await sleep(120);
  }
  console.log(`\n완료. 총 ${totalAdded}편 연결 추가.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
