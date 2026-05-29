/* eslint-disable @typescript-eslint/no-explicit-any */
// 큐레이션 자동 추가기 — 매 실행마다 "아직 없는" 큐레이션 1개를 추가한다.
//   1) Supabase 에서 기존 큐레이션 slug 목록을 읽고
//   2) 아래 QUEUE 에서 첫 번째 미추가 항목을 골라
//   3) 각 영화를 TMDb 검색으로 해석(제목+연도) → movies upsert → 큐레이션 연결
//   대기열이 모두 소진되면 아무 것도 하지 않고 종료(중복 생성 방지).
//
// 자격증명: scripts/.seed-env (gitignored) 또는 환경변수
//   TMDB_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY
//
// 실행: node scripts/add-next-curation.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

// .seed-env 로드 (KEY=VALUE 한 줄씩)
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
if (!TMDB_KEY || !SB_URL || !SB_KEY) {
  console.error("환경변수 누락: TMDB_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const IMG = "https://image.tmdb.org/t/p";
const sb = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

// ── 큐레이션 대기열 (감독전 · 사조 · 장르) ─────────────────────
// 영화는 {q: 검색어, y: 개봉연도}. 스크립트가 TMDb 에서 연도로 매칭해 해석.
const QUEUE = [
  {
    slug: "nouvelle-vague",
    title: "프랑스 누벨바그",
    description: "1950년대 말, 영화의 문법을 다시 쓴 젊은 작가들. 거리로 나간 카메라와 점프컷의 시대.",
    films: [
      { q: "네 멋대로 해라", y: 1960 },
      { q: "400번의 구타", y: 1959 },
      { q: "줄 앤 짐", y: 1962 },
      { q: "클레오", y: 1962 },
      { q: "미치광이 피에로", y: 1965 },
    ],
  },
  {
    slug: "bong-joon-ho",
    title: "봉준호 감독전",
    description: "장르를 비틀고 계급을 응시하는 시선. 봉준호의 세계.",
    films: [
      { q: "살인의 추억", y: 2003 },
      { q: "괴물", y: 2006 },
      { q: "마더", y: 2009 },
      { q: "설국열차", y: 2013 },
      { q: "기생충", y: 2019 },
    ],
  },
  {
    slug: "park-chan-wook",
    title: "박찬욱 감독전",
    description: "복수와 욕망, 그리고 양식미. 박찬욱의 미장센.",
    films: [
      { q: "올드보이", y: 2003 },
      { q: "친절한 금자씨", y: 2005 },
      { q: "박쥐", y: 2009 },
      { q: "아가씨", y: 2016 },
      { q: "헤어질 결심", y: 2022 },
    ],
  },
  {
    slug: "kubrick",
    title: "스탠리 큐브릭",
    description: "완벽주의자의 차가운 기하학. 장르마다 정점을 찍은 거장.",
    films: [
      { q: "2001 스페이스 오디세이", y: 1968 },
      { q: "시계태엽 오렌지", y: 1971 },
      { q: "샤이닝", y: 1980 },
      { q: "풀 메탈 자켓", y: 1987 },
      { q: "닥터 스트레인지러브", y: 1964 },
    ],
  },
  {
    slug: "hitchcock",
    title: "알프레드 히치콕",
    description: "서스펜스의 발명가. 관객을 공범으로 만드는 연출.",
    films: [
      { q: "싸이코", y: 1960 },
      { q: "현기증", y: 1958 },
      { q: "이창", y: 1954 },
      { q: "새", y: 1963 },
      { q: "북북서로 진로를 돌려라", y: 1959 },
    ],
  },
  {
    slug: "ghibli",
    title: "스튜디오 지브리",
    description: "손으로 그린 세계의 깊이. 미야자키와 다카하타의 애니메이션.",
    films: [
      { q: "센과 치히로의 행방불명", y: 2001 },
      { q: "이웃집 토토로", y: 1988 },
      { q: "모노노케 히메", y: 1997 },
      { q: "하울의 움직이는 성", y: 2004 },
      { q: "천공의 성 라퓨타", y: 1986 },
    ],
  },
  {
    slug: "tarkovsky",
    title: "안드레이 타르코프스키",
    description: "시간을 조각하는 영화. 느린 호흡과 영적 풍경.",
    films: [
      { q: "스토커", y: 1979 },
      { q: "솔라리스", y: 1972 },
      { q: "거울", y: 1975 },
      { q: "안드레이 루블료프", y: 1966 },
      { q: "희생", y: 1986 },
    ],
  },
  {
    slug: "scorsese",
    title: "마틴 스코세이지",
    description: "죄의식과 폭력, 그리고 구원. 미국 영화의 양심.",
    films: [
      { q: "택시 드라이버", y: 1976 },
      { q: "좋은 친구들", y: 1990 },
      { q: "성난 황소", y: 1980 },
      { q: "디파티드", y: 2006 },
      { q: "아이리시맨", y: 2019 },
    ],
  },
  {
    slug: "coen-brothers",
    title: "코엔 형제",
    description: "부조리와 운명, 건조한 유머. 코엔 형제의 미국.",
    films: [
      { q: "파고", y: 1996 },
      { q: "노인을 위한 나라는 없다", y: 2007 },
      { q: "위대한 레보스키", y: 1998 },
      { q: "바톤 핑크", y: 1991 },
      { q: "인사이드 르윈", y: 2013 },
    ],
  },
  {
    slug: "pta",
    title: "폴 토마스 앤더슨",
    description: "야망과 신앙, 미국이라는 신화를 해부하는 작가.",
    films: [
      { q: "데어 윌 비 블러드", y: 2007 },
      { q: "마스터", y: 2012 },
      { q: "부기 나이츠", y: 1997 },
      { q: "팬텀 스레드", y: 2017 },
      { q: "매그놀리아", y: 1999 },
    ],
  },
  {
    slug: "iranian-cinema",
    title: "이란 영화의 시정",
    description: "검열 속에서 피어난 은유. 일상에서 길어 올린 진실.",
    films: [
      { q: "체리 향기", y: 1997 },
      { q: "클로즈업", y: 1990 },
      { q: "친구의 집은 어디인가", y: 1987 },
      { q: "씨민과 나데르의 별거", y: 2011 },
      { q: "택시", y: 2015 },
    ],
  },
  {
    slug: "bergman",
    title: "잉마르 베리만",
    description: "신의 침묵과 인간의 얼굴. 영혼을 응시하는 클로즈업.",
    films: [
      { q: "제7의 봉인", y: 1957 },
      { q: "산딸기", y: 1957 },
      { q: "페르소나", y: 1966 },
      { q: "가을 소나타", y: 1978 },
      { q: "외침과 속삭임", y: 1972 },
    ],
  },
  {
    slug: "film-noir",
    title: "필름 누아르 클래식",
    description: "어둠과 그림자, 팜므파탈. 전후 미국의 불안이 만든 양식.",
    films: [
      { q: "이중 배상", y: 1944 },
      { q: "제3의 사나이", y: 1949 },
      { q: "말타의 매", y: 1941 },
      { q: "차이나타운", y: 1974 },
      { q: "선셋 대로", y: 1950 },
    ],
  },
  {
    slug: "lynch",
    title: "데이비드 린치",
    description: "꿈과 악몽의 경계. 미국 교외의 무의식.",
    films: [
      { q: "멀홀랜드 드라이브", y: 2001 },
      { q: "블루 벨벳", y: 1986 },
      { q: "엘리펀트 맨", y: 1980 },
      { q: "이레이저 헤드", y: 1977 },
      { q: "광란의 사랑", y: 1990 },
    ],
  },
  {
    slug: "lee-chang-dong",
    title: "이창동 감독전",
    description: "문학에서 길어 올린 삶의 통증. 한국 영화의 깊이.",
    films: [
      { q: "시", y: 2010 },
      { q: "밀양", y: 2007 },
      { q: "오아시스", y: 2002 },
      { q: "버닝", y: 2018 },
      { q: "박하사탕", y: 1999 },
    ],
  },
  {
    slug: "sci-fi-masterpieces",
    title: "SF 명작선",
    description: "미래를 빌려 현재를 묻는다. 과학소설이 도달한 정점.",
    films: [
      { q: "블레이드 러너", y: 1982 },
      { q: "매트릭스", y: 1999 },
      { q: "컨택트", y: 2016 },
      { q: "인터스텔라", y: 2014 },
      { q: "그녀", y: 2013 },
    ],
  },
];

async function tmdbSearch(q, y) {
  const url = (yr) =>
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&language=ko-KR&query=${encodeURIComponent(q)}${yr ? `&year=${yr}` : ""}`;
  for (const yr of [y, null]) {
    const res = await fetch(url(yr));
    if (!res.ok) continue;
    const data = await res.json();
    const results = data.results ?? [];
    if (results.length === 0) continue;
    // 연도가 있으면 ±1 내 매칭 우선, 없으면 첫 결과
    if (yr) {
      const exact = results.find((r) => {
        const ry = Number((r.release_date || "").slice(0, 4));
        return Math.abs(ry - y) <= 1;
      });
      if (exact) return exact.id;
    }
    return results[0].id;
  }
  return null;
}

async function upsertMovie(tmdbId) {
  const r = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits`,
  );
  if (!r.ok) throw new Error(`tmdb detail ${tmdbId} ${r.status}`);
  const m = await r.json();
  const row = {
    tmdb_id: m.id,
    imdb_id: m.imdb_id ?? null,
    title: m.title,
    original_title: m.original_title,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    director: m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
    country: m.production_countries?.[0]?.name ?? null,
    runtime: m.runtime ?? null,
    overview: m.overview ?? "",
    poster_path: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    genres: (m.genres ?? []).map((g) => g.name),
    tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
  };
  const res = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`movie upsert ${tmdbId} ${res.status} ${await res.text()}`);
  const [saved] = await res.json();
  return { id: saved.id, title: row.title, year: row.release_year };
}

async function main() {
  // 기존 큐레이션 slug
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=slug,sort_order`, { headers: sb });
  const existing = await r.json();
  const have = new Set(existing.map((c) => c.slug));
  const maxOrder = existing.reduce((mx, c) => Math.max(mx, c.sort_order ?? 0), 0);

  const next = QUEUE.find((c) => !have.has(c.slug));
  if (!next) {
    console.log(`[skip] 대기열의 모든 큐레이션이 이미 추가됨 (총 ${have.size}개). 추가 작업 없음.`);
    return;
  }

  console.log(`[add] "${next.title}" (${next.slug}) 추가 중…`);
  const cres = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
    method: "POST",
    headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      slug: next.slug,
      title: next.title,
      description: next.description,
      sort_order: maxOrder + 1,
    }),
  });
  if (!cres.ok) throw new Error(`curation ${next.slug} ${cres.status} ${await cres.text()}`);
  const [cur] = await cres.json();

  let pos = 1;
  for (const f of next.films) {
    try {
      const id = await tmdbSearch(f.q, f.y);
      if (!id) {
        console.log(`  ✗ "${f.q}" (${f.y}) TMDb 검색 결과 없음`);
        continue;
      }
      const mv = await upsertMovie(id);
      await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
        method: "POST",
        headers: { ...sb, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ curation_id: cur.id, movie_id: mv.id, position: pos++ }),
      });
      console.log(`  ✓ ${mv.title} (${mv.year})`);
    } catch (e) {
      console.log(`  ✗ "${f.q}" 실패: ${e.message}`);
    }
  }
  const remaining = QUEUE.filter((c) => c.slug !== next.slug && !have.has(c.slug)).length;
  console.log(`[done] "${next.title}" 추가 완료. 대기열 잔여: ${remaining}개`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
