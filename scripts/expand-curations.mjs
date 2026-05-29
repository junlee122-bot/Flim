/* eslint-disable @typescript-eslint/no-explicit-any */
// 기존 큐레이션을 더 깊게 — 각 큐레이션의 영화 수를 늘린다(최대 TARGET_PER 편).
//   감독전: 그 감독 작품을 더 끌어와 채우고
//   discover 계열(genre-/cinema-/decade-): 평점순 다음 페이지에서 채운다.
//   이미 담긴 영화는 건너뛴다(멱등).
//
// 실행: node scripts/expand-curations.mjs [편수=10]

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
if (!TMDB_KEY || !SB_URL || !SB_KEY) {
  console.error("환경변수 누락");
  process.exit(1);
}

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

const G = { action:28, adventure:12, animation:16, comedy:35, crime:80, documentary:99, drama:18,
  family:10751, fantasy:14, history:36, horror:27, music:10402, mystery:9648, romance:10749,
  scifi:878, thriller:53, war:10752, western:37 };

// slug → 영화 후보 ID 목록 (넉넉히)
async function candidatesFor(slug) {
  // 감독전: person 검색명은 title 로 알 수 없으니, director slug 는 매핑이 필요.
  // 여기서는 discover 계열만 더 채운다(감독전은 build 시 6편으로 충분).
  if (slug.startsWith("cinema-")) {
    const lang = { japan:"ja", korea:"ko", france:"fr", italy:"it", spain:"es", germany:"de",
      india:"hi", china:"zh", russia:"ru", iran:"fa", sweden:"sv", brazil:"pt" }[slug.replace("cinema-","")];
    if (!lang) return [];
    return discover({ lang, voteGte: 100 });
  }
  if (slug.startsWith("genre-")) {
    const g = G[slug.replace("genre-","")];
    if (!g) return [];
    return discover({ genres: g, voteGte: 200 });
  }
  if (slug.startsWith("decade-")) {
    const dec = slug.replace("decade-","").replace("s","");
    const y = Number(dec);
    if (!y) return [];
    return discover({ dateGte: `${y}-01-01`, dateLte: `${y + 9}-12-31`, voteGte: 400 });
  }
  return [];
}

async function discover({ genres, lang, dateGte, dateLte, voteGte = 200 }) {
  const ids = [];
  for (let page = 1; page <= 3; page++) {
    const params = ["sort_by=vote_average.desc", `vote_count.gte=${voteGte}`, "include_adult=false", `page=${page}`];
    if (genres) params.push(`with_genres=${genres}`);
    if (lang) params.push(`with_original_language=${lang}`);
    if (dateGte) params.push(`primary_release_date.gte=${dateGte}`);
    if (dateLte) params.push(`primary_release_date.lte=${dateLte}`);
    const data = await tmdb(`/discover/movie?${params.join("&")}`);
    for (const m of data?.results ?? []) if (m.poster_path) ids.push(m.id);
  }
  return ids;
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
    // 현재 담긴 영화 수 + tmdb_id 집합
    const cm = await fetch(`${SB_URL}/rest/v1/curation_movies?curation_id=eq.${c.id}&select=position,movies(tmdb_id)`, { headers: sb });
    const rows = await cm.json();
    const haveTmdb = new Set(rows.map((x) => x.movies?.tmdb_id).filter(Boolean));
    let pos = rows.reduce((m, x) => Math.max(m, x.position ?? 0), 0);
    if (haveTmdb.size >= TARGET_PER) continue;

    const cand = await candidatesFor(c.slug);
    if (cand.length === 0) continue; // 감독전 등은 스킵

    let added = 0;
    for (const tmdbId of cand) {
      if (haveTmdb.size >= TARGET_PER) break;
      if (haveTmdb.has(tmdbId)) continue;
      const mid = await upsertMovie(tmdbId);
      if (!mid) continue;
      const link = await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
        method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ curation_id: c.id, movie_id: mid, position: ++pos }),
      });
      if (link.ok) { haveTmdb.add(tmdbId); added++; totalAdded++; }
    }
    if (added > 0) console.log(`  + ${c.title}: +${added}편 (총 ${haveTmdb.size})`);
    await sleep(100);
  }
  console.log(`\n완료. 총 ${totalAdded}편의 연결 추가.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
