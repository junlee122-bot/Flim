/* eslint-disable @typescript-eslint/no-explicit-any */
// 큐레이션 추가 배치 (2차) — 감독/배우/테마를 더 늘린다. 멱등.
// 실행: node scripts/add-more-curations.mjs [편수=10]

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

// 감독전 추가분 (slug, 제목, 검색어, 설명)
const DIRECTORS = [
  ["yeon-sang-ho", "연상호", "연상호", "애니메이션에서 실사까지. 한국 장르영화의 확장."],
  ["na-hong-jin", "나홍진", "나홍진", "추격과 광기. 강렬한 한국 스릴러의 한 정점."],
  ["kim-jee-woon", "김지운", "김지운", "장르를 자유자재로 다루는 스타일리스트."],
  ["ryu-seung-wan", "류승완", "류승완", "충무로의 액션 장인."],
  ["miyazaki-isao", "다카하타 이사오", "다카하타 이사오", "지브리의 또 다른 축. 일상과 비극의 애니메이션."],
  ["shinkai", "신카이 마코토", "신카이 마코토", "빛과 거리(距離)의 애니메이션. 너의 이름은."],
  ["hosoda", "호소다 마모루", "호소다 마모루", "가족과 시간을 그리는 애니메이션 작가."],
  ["kon", "곤 사토시", "곤 사토시", "현실과 환상의 경계. 퍼펙트 블루의 천재."],
  ["fincher2", "조던 필", "조던 필", "사회적 호러의 새 얼굴."],
  ["chazelle", "데이미언 셔젤", "Damien Chazelle", "재즈와 야망의 리듬. 라라랜드·위플래쉬."],
  ["iñárritu", "알레한드로 곤살레스 이냐리투", "Alejandro González Iñárritu", "강렬한 롱테이크와 인간 군상."],
  ["the-daniels", "셀린 송", "셀린 송", "이민과 인연의 정서. 패스트 라이브즈."],
  ["baumbach", "노아 바움백", "Noah Baumbach", "가족과 결혼, 뉴욕 지식인의 초상."],
  ["jenkins", "배리 젱킨스", "Barry Jenkins", "흑인의 삶을 시적으로. 문라이트."],
  ["ari-aster", "아리 애스터", "Ari Aster", "불안과 가족 트라우마의 호러."],
  ["villeneuve2", "조지 밀러", "George Miller", "매드맥스의 창조자. 광기의 액션."],
  ["ridley-scott", "리들리 스콧", "Ridley Scott", "에일리언과 블레이드 러너. SF 비주얼의 거장."],
  ["james-cameron", "제임스 카메론", "James Cameron", "기술과 스펙터클의 최전선."],
  ["tarr", "벨라 타르", "Béla Tarr", "흑백의 롱테이크. 헝가리의 묵시록."],
  ["roy-andersson", "로이 안데르손", "Roy Andersson", "부조리한 타블로. 스웨덴의 유머."],
];

// 배우전 추가분
const ACTORS = [
  ["actor-ryu-jun-yeol", "류준열", "류준열"],
  ["actor-kim-min-hee", "김민희", "김민희"],
  ["actor-yoo-ah-in", "유아인", "유아인"],
  ["actor-isabelle-huppert", "이자벨 위페르", "Isabelle Huppert"],
  ["actor-marion-cotillard", "마리옹 코티야르", "Marion Cotillard"],
  ["actor-christian-bale", "크리스찬 베일", "Christian Bale"],
  ["actor-gary-oldman", "게리 올드만", "Gary Oldman"],
  ["actor-philip-seymour", "필립 시모어 호프먼", "Philip Seymour Hoffman"],
  ["actor-amy-adams", "에이미 아담스", "Amy Adams"],
  ["actor-saoirse", "시얼샤 로넌", "Saoirse Ronan"],
  ["actor-oscar-isaac", "오스카 아이작", "Oscar Isaac"],
  ["actor-adam-driver", "애덤 드라이버", "Adam Driver"],
];

// 테마 추가분 (TMDb 검색어 + 연도)
const THEMES = [
  ["heist", "케이퍼·하이스트 무비", "완벽한 한탕을 위한 설계. 케이퍼 무비의 쾌감.", [
    ["오션스 일레븐",2001],["히트",1995],["도둑들",2012],["인사이드 맨",2006],["베이비 드라이버",2017],
    ["나우 유 씨 미",2013],["라이언 일병 구하기",1998],["탈주",2024],["완벽한 타인",2018],["기생충",2019]]],
  ["coming-of-age", "성장영화", "어른이 되어가는 통과의례. 청춘의 한 시절.", [
    ["보이후드",2014],["콜 미 바이 유어 네임",2017],["레이디 버드",2017],["스탠 바이 미",1986],["월플라워",2012],
    ["우리들",2016],["벌새",2018],["문라이트",2016],["400번의 구타",1959],["에이트 그레이드",2018]]],
  ["one-location", "한 공간의 영화", "제한된 공간이 만드는 긴장. 미니멀 스릴러.", [
    ["베리드",2010],["12명의 성난 사람들",1957],["로프",1948],["폰 부스",2002],["리어 윈도우",1954],
    ["큐브",1997],["엑스 마키나",2014],["미저리",1990],["콜",2020],["더 플랫폼",2019]]],
  ["road-movie", "로드무비", "길 위에서 발견하는 자신. 떠남의 영화.", [
    ["보헤미안 랩소디",2018],["델마와 루이스",1991],["인투 더 와일드",2007],["리틀 미스 선샤인",2006],
    ["내일을 향해 쏴라",1969],["퍼스트 카우",2019],["노매드랜드",2020],["모터사이클 다이어리",2004],
    ["사이드웨이",2004],["그린 북",2018]]],
  ["time-loop", "시간 루프·타임루프", "반복되는 하루. 시간을 비트는 영화.", [
    ["엣지 오브 투모로우",2014],["사랑의 블랙홀",1993],["해피 데스데이",2017],["팜 스프링스",2020],
    ["나비효과",2004],["소스 코드",2011],["콜",2020],["어바웃 타임",2013],["테넷",2020],["루퍼",2012]]],
  ["courtroom", "법정 영화", "진실을 다투는 공방. 법정 드라마의 긴장.", [
    ["12명의 성난 사람들",1957],["어 퓨 굿 맨",1992],["다크 워터스",2019],["저스트 머시",2019],
    ["시카고 7인의 재판",2020],["언터처블",1987],["래리 플린트",1996],["필라델피아",1993],
    ["변호인",2013],["부러진 화살",2011]]],
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

async function personFilms(query, dept) {
  const p = await tmdb(`/search/person?query=${encodeURIComponent(query)}`);
  const person = p?.results?.find((r) => r.known_for_department === dept) ?? p?.results?.[0];
  if (!person) return [];
  const c = await tmdb(`/person/${person.id}/movie_credits`);
  const list = dept === "Directing"
    ? (c?.crew ?? []).filter((x) => x.job === "Director")
    : (c?.cast ?? []);
  const films = list
    .filter((x) => x.release_date && (x.vote_count ?? 0) >= (dept === "Directing" ? 15 : 50) && x.poster_path)
    .reduce((a, x) => { if (!a.some((y) => y.id === x.id)) a.push(x); return a; }, []);
  films.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const pool = films.slice(0, Math.max(PER + 8, 18));
  pool.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return pool.slice(0, PER).map((m) => m.id);
}

async function searchFilm(title, year) {
  for (const y of [year, null]) {
    const d = await tmdb(`/search/movie?query=${encodeURIComponent(title)}${y ? `&year=${y}` : ""}`);
    const r = d?.results ?? [];
    if (!r.length) continue;
    if (y) { const e = r.find((x) => Math.abs(Number((x.release_date||"").slice(0,4)) - year) <= 1); if (e) return e.id; }
    return r[0].id;
  }
  return null;
}

async function createCuration(slug, title, desc, filmIds, max) {
  if (filmIds.length < 3) return false;
  const cr = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ slug, title, description: desc, sort_order: max }),
  });
  const [cur] = await cr.json(); let pos = 1;
  for (const fid of filmIds) {
    const mid = await upsertMovie(fid); if (!mid) continue;
    await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
      method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ curation_id: cur.id, movie_id: mid, position: pos++ }),
    });
  }
  return true;
}

async function main() {
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=slug,sort_order`, { headers: sb });
  const rows = await r.json();
  const have = new Set(rows.map((c) => c.slug));
  let max = rows.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

  for (const [slug, title, query, desc] of DIRECTORS) {
    if (have.has(slug)) { console.log(`= ${title}`); continue; }
    const ids = await personFilms(query, "Directing");
    if (await createCuration(slug, `${title} 감독전`, desc, ids, ++max)) console.log(`✓ ${title} 감독전 (${ids.length})`);
    else { max--; console.log(`✗ ${title} (${ids.length})`); }
    await sleep(100);
  }
  for (const [slug, title, query] of ACTORS) {
    if (have.has(slug)) { console.log(`= ${title}`); continue; }
    const ids = await personFilms(query, "Acting");
    if (await createCuration(slug, `${title} 출연작`, `${title}의 대표 출연작.`, ids, ++max)) console.log(`✓ ${title} 출연작 (${ids.length})`);
    else { max--; console.log(`✗ ${title} (${ids.length})`); }
    await sleep(100);
  }
  for (const [slug, title, desc, films] of THEMES) {
    if (have.has(slug)) { console.log(`= ${title}`); continue; }
    const ids = [];
    for (const [t, y] of films) { const id = await searchFilm(t, y); if (id) ids.push(id); }
    if (await createCuration(slug, title, desc, ids, ++max)) console.log(`✓ ${title} (${ids.length})`);
    else { max--; console.log(`✗ ${title} (${ids.length})`); }
    await sleep(100);
  }
  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
