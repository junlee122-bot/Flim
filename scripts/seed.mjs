/* eslint-disable @typescript-eslint/no-explicit-any */
// 실제 큐레이션 시드 스크립트
//   - TMDb 에서 영화 메타데이터를 가져와 Supabase movies 에 upsert
//   - 큐레이션 생성 + 영화 연결
//   - 일부 작품에 수상 정보 추가
// 실행: TMDB_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed.mjs

const TMDB_KEY = process.env.TMDB_API_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!TMDB_KEY || !SB_URL || !SB_KEY) {
  console.error("환경변수 누락: TMDB_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const IMG = "https://image.tmdb.org/t/p";
const sbHeaders = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(
    `https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}&language=ko-KR`,
  );
  if (!res.ok) throw new Error(`TMDb ${path} → ${res.status}`);
  return res.json();
}

// TMDb 상세 → movies 행 upsert → movie uuid 반환
async function upsertMovie(tmdbId) {
  const m = await tmdb(`/movie/${tmdbId}?append_to_response=credits`);
  const director =
    m.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const country = m.production_countries?.[0]?.name ?? null;
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;

  const row = {
    tmdb_id: m.id,
    imdb_id: m.imdb_id ?? null,
    title: m.title,
    original_title: m.original_title,
    release_year: year,
    director,
    country,
    runtime: m.runtime ?? null,
    overview: m.overview ?? "",
    poster_path: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_path: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    genres: (m.genres ?? []).map((g) => g.name),
    tmdb_rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
  };

  const res = await fetch(`${SB_URL}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`movie upsert ${tmdbId} → ${res.status} ${await res.text()}`);
  const [saved] = await res.json();
  console.log(`  ✓ ${row.title} (${year})`);
  return saved.id;
}

async function upsertCuration(c) {
  const res = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      slug: c.slug,
      title: c.title,
      description: c.description,
      sort_order: c.sort_order,
    }),
  });
  if (!res.ok) throw new Error(`curation ${c.slug} → ${res.status} ${await res.text()}`);
  const [saved] = await res.json();
  return saved.id;
}

async function linkMovie(curationId, movieId, position) {
  await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ curation_id: curationId, movie_id: movieId, position }),
  });
}

async function addAward(movieId, award) {
  await fetch(`${SB_URL}/rest/v1/awards`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify({ movie_id: movieId, ...award }),
  });
}

// ── 큐레이션 정의 (TMDb ID 기준, 검증 완료) ──────────────────
const CURATIONS = [
  {
    slug: "intro-classics",
    title: "입문자를 위한 고전 영화",
    description:
      "영화의 역사를 처음 거슬러 오를 때 길잡이가 되는 작품들. 무엇을 먼저 봐야 할지 막막하다면 여기서부터.",
    sort_order: 1,
    movies: [
      238, // 대부
      278, // 쇼생크 탈출
      389, // 12명의 성난 사람들
      103, // 택시 드라이버
      426, // 현기증
      422, // 8과 1/2
    ],
  },
  {
    slug: "cannes-palme-dor",
    title: "칸 황금종려상 수상작",
    description: "칸 영화제 최고의 영예, 황금종려상이 호명한 작품들.",
    sort_order: 2,
    movies: [
      496243, // 기생충 (2019)
      680, // 펄프 픽션 (1994)
      103, // 택시 드라이버 (1976)
      86837, // 아무르 (2012)
      2009, // 4개월, 3주… 그리고 2일 (2007)
      8967, // 트리 오브 라이프 (2011)
    ],
  },
  {
    slug: "a24",
    title: "A24 영화",
    description:
      "독립 영화의 새로운 감각. A24가 배급하며 만든 동시대 작가주의의 결들.",
    sort_order: 3,
    movies: [
      545611, // 에브리씽 에브리웨어 올 앳 원스
      530385, // 미드소마
      493922, // 유전
      503919, // 라이트하우스
      376867, // 문라이트
      391713, // 레이디 버드
    ],
  },
  {
    slug: "hk-90s",
    title: "90년대 홍콩영화",
    description:
      "느와르와 멜로, 무협이 뒤섞이던 홍콩영화의 황금기. 그 시절의 색과 음악.",
    sort_order: 4,
    movies: [
      11104, // 중경삼림 (1994)
      40751, // 동사서독 (1994)
      18329, // 해피 투게더 (1997)
      843, // 화양연화 (2000)
      11471, // 영웅본색 (1986)
      30421, // 천녀유혼 (1987)
    ],
  },
];

async function main() {
  console.log("시드 시작…\n");
  for (const c of CURATIONS) {
    console.log(`[큐레이션] ${c.title}`);
    const cid = await upsertCuration(c);
    let pos = 1;
    for (const tmdbId of c.movies) {
      try {
        const mid = await upsertMovie(tmdbId);
        await linkMovie(cid, mid, pos++);
      } catch (e) {
        console.log(`  ✗ tmdb ${tmdbId} 건너뜀: ${e.message}`);
      }
    }
    console.log("");
  }

  // 기생충 수상 정보
  try {
    const r = await fetch(`${SB_URL}/rest/v1/movies?tmdb_id=eq.496243&select=id`, {
      headers: sbHeaders,
    });
    const [pm] = await r.json();
    if (pm) {
      await addAward(pm.id, { festival: "칸 영화제", category: "황금종려상", year: 2019, result: "won" });
      await addAward(pm.id, { festival: "아카데미", category: "작품상", year: 2020, result: "won" });
      await addAward(pm.id, { festival: "아카데미", category: "감독상", year: 2020, result: "won" });
      console.log("기생충 수상 정보 추가 완료");
    }
  } catch (e) {
    console.log("수상 정보 추가 실패:", e.message);
  }

  console.log("\n시드 완료.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
