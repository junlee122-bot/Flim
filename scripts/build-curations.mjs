/* eslint-disable @typescript-eslint/no-explicit-any */
// 큐레이션 일괄 빌더 — DB 큐레이션이 TARGET 개가 될 때까지 추가한다.
//   영화는 손으로 적지 않고 TMDb 로 동적 선별:
//     - 감독전: person 검색 → 대표작(투표수 상위) 중 평점순 상위
//     - 장르/국가/연대/조합: discover 로 평점순 상위
//   멱등(on_conflict) — 이미 있는 slug 는 건너뛴다.
//
// 자격증명: scripts/.seed-env (gitignored) 또는 환경변수
// 실행: node scripts/build-curations.mjs [목표개수]

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
const TARGET = Number(process.argv[2] || 100);
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path) {
  const sep = path.includes("?") ? "&" : "?";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3${path}${sep}api_key=${TMDB_KEY}&language=ko-KR`,
      );
      if (res.status === 429) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(500);
    }
  }
  return null;
}

// ── 영화 선별기 ──────────────────────────────────────────
async function directorFilms(query) {
  const p = await tmdb(`/search/person?query=${encodeURIComponent(query)}`);
  const person = p?.results?.find((r) => r.known_for_department === "Directing") ?? p?.results?.[0];
  if (!person) return [];
  const credits = await tmdb(`/person/${person.id}/movie_credits`);
  const directed = (credits?.crew ?? [])
    .filter((c) => c.job === "Director" && c.release_date && (c.vote_count ?? 0) >= 20 && c.poster_path)
    .reduce((acc, c) => {
      if (!acc.some((x) => x.id === c.id)) acc.push(c);
      return acc;
    }, []);
  // 대표작(투표수 상위 12) 중 평점순 상위 6
  directed.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
  const pool = directed.slice(0, 12);
  pool.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
  return pool.slice(0, 6).map((m) => m.id);
}

async function discoverFilms({ genres, lang, dateGte, dateLte, voteGte = 300, region }) {
  const params = [
    "sort_by=vote_average.desc",
    `vote_count.gte=${voteGte}`,
    "include_adult=false",
  ];
  if (genres) params.push(`with_genres=${genres}`);
  if (lang) params.push(`with_original_language=${lang}`);
  if (region) params.push(`region=${region}`);
  if (dateGte) params.push(`primary_release_date.gte=${dateGte}`);
  if (dateLte) params.push(`primary_release_date.lte=${dateLte}`);
  const data = await tmdb(`/discover/movie?${params.join("&")}`);
  return (data?.results ?? []).filter((m) => m.poster_path).slice(0, 6).map((m) => m.id);
}

async function upsertMovie(tmdbId) {
  const m = await tmdb(`/movie/${tmdbId}?append_to_response=credits`);
  if (!m || !m.id) return null;
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
  if (!res.ok) return null;
  const [saved] = await res.json();
  return saved.id;
}

async function createCuration(meta, filmIds) {
  if (filmIds.length < 3) return false; // 영화 너무 적으면 스킵
  const cres = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
    method: "POST",
    headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(meta),
  });
  if (!cres.ok) return false;
  const [cur] = await cres.json();
  let pos = 1;
  for (const fid of filmIds) {
    const mid = await upsertMovie(fid);
    if (!mid) continue;
    await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
      method: "POST",
      headers: { ...sb, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ curation_id: cur.id, movie_id: mid, position: pos++ }),
    });
  }
  return true;
}

// ── 큐레이션 정의 ────────────────────────────────────────
const directors = (slug, title, query, desc) => ({
  slug, title, desc, kind: "director", query,
});
const discover = (slug, title, desc, opts) => ({ slug, title, desc, kind: "discover", opts });

const DIRECTORS = [
  ["fellini", "페데리코 펠리니", "Federico Fellini", "환상과 기억, 서커스 같은 삶. 이탈리아 영화의 마술사."],
  ["godard", "장뤼크 고다르", "Jean-Luc Godard", "영화를 해체하고 다시 조립한 누벨바그의 혁명가."],
  ["truffaut", "프랑수아 트뤼포", "François Truffaut", "영화에 대한 사랑을 영화로 만든 시네필의 원형."],
  ["antonioni", "미켈란젤로 안토니오니", "Michelangelo Antonioni", "현대인의 권태와 소외를 응시한 모더니즘의 거장."],
  ["bergman", "잉마르 베리만", "Ingmar Bergman", "신의 침묵과 인간의 얼굴. 영혼을 응시하는 클로즈업."],
  ["kurosawa", "구로사와 아키라", "Akira Kurosawa", "활극과 휴머니즘. 세계 영화에 가장 큰 그림자를 드리운 거장."],
  ["ozu", "오즈 야스지로", "Yasujiro Ozu", "다다미 쇼트와 가족의 시간. 일상의 가장 깊은 곳."],
  ["mizoguchi", "미조구치 겐지", "Kenji Mizoguchi", "긴 호흡의 트래킹과 여성의 수난. 일본 고전의 미학."],
  ["kore-eda", "고레에다 히로카즈", "Hirokazu Kore-eda", "가족이라는 이름의 미스터리. 따뜻하고 서늘한 시선."],
  ["miyazaki", "미야자키 하야오", "Hayao Miyazaki", "하늘과 비행, 자연과 아이들. 손으로 그린 경이."],
  ["hou", "허우샤오시엔", "Hou Hsiao-hsien", "롱테이크로 응시하는 시간과 역사. 대만 영화의 결."],
  ["edward-yang", "에드워드 양", "Edward Yang", "도시의 불안과 청춘. 대만 뉴웨이브의 또 하나의 정점."],
  ["wong-kar-wai", "왕가위", "Wong Kar-wai", "스텝 프린팅과 네온, 엇갈린 사랑의 시간."],
  ["zhang-yimou", "장이머우", "Zhang Yimou", "색채의 화폭과 시대의 비극. 중국 5세대의 대표 주자."],
  ["hitchcock", "알프레드 히치콕", "Alfred Hitchcock", "서스펜스의 발명가. 관객을 공범으로 만드는 연출."],
  ["scorsese", "마틴 스코세이지", "Martin Scorsese", "죄의식과 폭력, 그리고 구원. 미국 영화의 양심."],
  ["coppola", "프랜시스 포드 코폴라", "Francis Ford Coppola", "오페라적 스케일의 미국 서사시. 뉴 할리우드의 황제."],
  ["spielberg", "스티븐 스필버그", "Steven Spielberg", "경이와 공포를 동시에 다루는 대중 영화의 대가."],
  ["tarantino", "쿠엔틴 타란티노", "Quentin Tarantino", "장르의 콜라주와 수다. 영화광이 만든 영화."],
  ["pta", "폴 토마스 앤더슨", "Paul Thomas Anderson", "야망과 신앙, 미국이라는 신화를 해부하는 작가."],
  ["fincher", "데이비드 핀처", "David Fincher", "강박적 정교함과 어둠. 디지털 시대의 장인."],
  ["lynch", "데이비드 린치", "David Lynch", "꿈과 악몽의 경계. 미국 교외의 무의식."],
  ["malick", "테런스 맬릭", "Terrence Malick", "속삭이는 내레이션과 자연광. 영화로 쓴 시."],
  ["wes-anderson", "웨스 앤더슨", "Wes Anderson", "대칭과 파스텔, 인형의 집 같은 세계."],
  ["nolan", "크리스토퍼 놀란", "Christopher Nolan", "시간과 구조의 건축가. 블록버스터의 지성."],
  ["villeneuve", "드니 빌뇌브", "Denis Villeneuve", "묵직한 분위기와 스케일. 동시대 SF의 얼굴."],
  ["cuaron", "알폰소 쿠아론", "Alfonso Cuarón", "롱테이크의 마법과 인간적 온기. 멕시코의 거장."],
  ["del-toro", "기예르모 델 토로", "Guillermo del Toro", "괴물에 대한 애정. 동화와 호러의 경계."],
  ["almodovar", "페드로 알모도바르", "Pedro Almodóvar", "욕망과 멜로드라마, 강렬한 색채. 스페인의 작가."],
  ["von-trier", "라스 폰 트리에", "Lars von Trier", "도발과 실험. 관객을 시험하는 덴마크의 이단아."],
  ["haneke", "미카엘 하네케", "Michael Haneke", "폭력과 죄책감을 차갑게 응시하는 윤리적 카메라."],
  ["kieslowski", "크쥐시토프 키에슬로프스키", "Krzysztof Kieślowski", "우연과 운명, 색의 삼부작. 폴란드의 사색가."],
  ["kiarostami", "압바스 키아로스타미", "Abbas Kiarostami", "삶과 영화의 경계를 묻는 이란 영화의 시인."],
  ["polanski", "로만 폴란스키", "Roman Polanski", "밀실의 불안과 심리적 공포의 대가."],
  ["lee-chang-dong", "이창동", "Lee Chang-dong", "문학에서 길어 올린 삶의 통증. 한국 영화의 깊이."],
  ["hong-sang-soo", "홍상수", "Hong Sang-soo", "반복과 변주, 술자리의 진실. 미니멀리즘의 작가."],
  ["lanthimos", "요르고스 란티모스", "Yorgos Lanthimos", "기괴한 규칙의 세계. 그리스 위어드 웨이브."],
  ["greta-gerwig", "그레타 거윅", "Greta Gerwig", "성장과 여성의 목소리. 동시대 미국 영화의 새 얼굴."],
  ["spike-lee", "스파이크 리", "Spike Lee", "분노와 리듬, 흑인의 삶. 뉴욕의 목소리."],
  ["chaplin", "찰리 채플린", "Charlie Chaplin", "웃음 속의 페이소스. 무성영화가 낳은 불멸의 광대."],
  ["welles", "오슨 웰스", "Orson Welles", "딥 포커스와 야망. 영화 언어를 재발명한 천재."],
  ["billy-wilder", "빌리 와일더", "Billy Wilder", "냉소와 위트의 각본. 할리우드 황금기의 거장."],
  ["leone", "세르지오 레오네", "Sergio Leone", "황야의 클로즈업과 엔니오 모리코네. 스파게티 웨스턴."],
  ["denis", "클레르 드니", "Claire Denis", "몸과 욕망, 포스트식민의 감각. 프랑스의 작가."],
  ["varda", "아녜스 바르다", "Agnès Varda", "누벨바그의 어머니. 다큐와 픽션을 넘나든 시선."],
  ["jia-zhangke", "지아장커", "Jia Zhangke", "변모하는 중국의 풍경. 동시대 중국의 기록자."],
  ["kitano", "기타노 다케시", "Takeshi Kitano", "정적과 폭발, 건조한 폭력의 미학."],
  ["refn", "니콜라스 빈딩 레픈", "Nicolas Winding Refn", "네온과 침묵, 양식화된 폭력."],
  ["aronofsky", "대런 아로노프스키", "Darren Aronofsky", "강박과 파멸로 치닫는 심리의 극한."],
];

const G = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749, scifi: 878,
  thriller: 53, war: 10752, western: 37,
};

const GENRE_CURATIONS = [
  discover("genre-thriller", "스릴러 명작선", "긴장의 끈을 놓을 수 없는, 장르의 정점.", { genres: G.thriller, voteGte: 1500 }),
  discover("genre-crime", "범죄 영화 명작선", "범죄와 그 그림자를 응시한 작품들.", { genres: G.crime, voteGte: 1500 }),
  discover("genre-scifi", "SF 명작선", "미래를 빌려 현재를 묻는 과학소설의 정점.", { genres: G.scifi, voteGte: 2000 }),
  discover("genre-horror", "호러 명작선", "공포라는 장르가 도달한 가장 깊은 곳.", { genres: G.horror, voteGte: 1200 }),
  discover("genre-romance", "로맨스 명작선", "사랑의 모든 결을 담은 작품들.", { genres: G.romance, voteGte: 1200 }),
  discover("genre-animation", "애니메이션 명작선", "그림이 도달한 예술의 경지.", { genres: G.animation, voteGte: 1500 }),
  discover("genre-comedy", "코미디 명작선", "웃음 뒤에 남는 것. 희극의 명작들.", { genres: G.comedy, voteGte: 1500 }),
  discover("genre-war", "전쟁 영화 명작선", "전장의 참혹과 인간. 반전(反戰)의 기록.", { genres: G.war, voteGte: 1000 }),
  discover("genre-western", "서부극 명작선", "황야와 총잡이, 미국이라는 신화.", { genres: G.western, voteGte: 600 }),
  discover("genre-mystery", "미스터리 명작선", "수수께끼를 푸는 쾌감. 미스터리의 정수.", { genres: G.mystery, voteGte: 1200 }),
  discover("genre-fantasy", "판타지 명작선", "현실 너머의 세계를 그린 작품들.", { genres: G.fantasy, voteGte: 2000 }),
  discover("genre-drama", "드라마 명작선", "삶을 가장 진하게 담아내는 장르.", { genres: G.drama, voteGte: 3000 }),
  discover("genre-adventure", "모험 영화 명작선", "미지로 떠나는 여정. 모험의 명작들.", { genres: G.adventure, voteGte: 2500 }),
  discover("genre-history", "역사 영화 명작선", "지나간 시대를 스크린에 되살린 작품들.", { genres: G.history, voteGte: 800 }),
  discover("genre-music", "음악 영화 명작선", "선율이 이야기가 되는 순간.", { genres: G.music, voteGte: 500 }),
  discover("genre-family", "가족이 함께 보는 영화", "세대를 넘어 사랑받는 작품들.", { genres: G.family, voteGte: 2000 }),
  discover("genre-documentary", "다큐멘터리 명작선", "현실이 가장 강력한 드라마일 때.", { genres: G.documentary, voteGte: 200 }),
  discover("genre-action", "액션 명작선", "순수한 운동 에너지. 액션의 쾌감.", { genres: G.action, voteGte: 3000 }),
];

const COUNTRY_CURATIONS = [
  discover("cinema-japan", "일본 영화 베스트", "오즈에서 고레에다까지. 일본 영화의 결.", { lang: "ja", voteGte: 400 }),
  discover("cinema-korea", "한국 영화 베스트", "동시대 세계가 주목하는 한국 영화.", { lang: "ko", voteGte: 400 }),
  discover("cinema-france", "프랑스 영화 베스트", "영화의 발상지가 빚어낸 작품들.", { lang: "fr", voteGte: 400 }),
  discover("cinema-italy", "이탈리아 영화 베스트", "네오리얼리즘에서 펠리니까지.", { lang: "it", voteGte: 300 }),
  discover("cinema-spain", "스페인어권 영화 베스트", "알모도바르와 라틴 아메리카의 목소리.", { lang: "es", voteGte: 400 }),
  discover("cinema-germany", "독일 영화 베스트", "표현주의의 후예들.", { lang: "de", voteGte: 300 }),
  discover("cinema-india", "인도 영화 베스트", "노래와 춤, 거대한 감정의 대륙.", { lang: "hi", voteGte: 200 }),
  discover("cinema-china", "중화권 영화 베스트", "대륙과 홍콩, 대만을 아우르는 시선.", { lang: "zh", voteGte: 250 }),
  discover("cinema-russia", "러시아 영화 베스트", "타르코프스키의 나라, 깊은 사색.", { lang: "ru", voteGte: 150 }),
  discover("cinema-iran", "이란 영화 베스트", "검열 속에서 피어난 은유의 영화.", { lang: "fa", voteGte: 100 }),
  discover("cinema-sweden", "북유럽 영화 베스트", "베리만의 나라, 서늘한 빛.", { lang: "sv", voteGte: 150 }),
  discover("cinema-brazil", "브라질 영화 베스트", "열기와 빈민가, 강렬한 리듬.", { lang: "pt", voteGte: 150 }),
];

const DECADE_CURATIONS = [
  discover("decade-1950s", "1950년대 명작", "고전 영화의 황금기.", { dateGte: "1950-01-01", dateLte: "1959-12-31", voteGte: 500 }),
  discover("decade-1960s", "1960년대 명작", "뉴웨이브와 모더니즘의 시대.", { dateGte: "1960-01-01", dateLte: "1969-12-31", voteGte: 600 }),
  discover("decade-1970s", "1970년대 명작", "뉴 할리우드와 작가주의의 폭발.", { dateGte: "1970-01-01", dateLte: "1979-12-31", voteGte: 800 }),
  discover("decade-1980s", "1980년대 명작", "블록버스터와 컬트의 시대.", { dateGte: "1980-01-01", dateLte: "1989-12-31", voteGte: 1000 }),
  discover("decade-1990s", "1990년대 명작", "인디와 장르의 르네상스.", { dateGte: "1990-01-01", dateLte: "1999-12-31", voteGte: 2000 }),
  discover("decade-2000s", "2000년대 명작", "디지털 전환기의 걸작들.", { dateGte: "2000-01-01", dateLte: "2009-12-31", voteGte: 3000 }),
  discover("decade-2010s", "2010년대 명작", "스트리밍 시대 직전의 정점.", { dateGte: "2010-01-01", dateLte: "2019-12-31", voteGte: 5000 }),
  discover("decade-2020s", "2020년대 화제작", "지금 이 순간의 영화.", { dateGte: "2020-01-01", dateLte: "2029-12-31", voteGte: 3000 }),
];

const COMBO_CURATIONS = [
  discover("japan-animation", "일본 애니메이션 명작", "세계를 사로잡은 일본 애니의 정수.", { lang: "ja", genres: G.animation, voteGte: 300 }),
  discover("korea-thriller", "한국 스릴러", "장르의 쾌감을 끌어올린 한국 스릴러.", { lang: "ko", genres: G.thriller, voteGte: 200 }),
  discover("korea-crime", "한국 범죄 영화", "느와르와 범죄, 한국적 질감.", { lang: "ko", genres: G.crime, voteGte: 200 }),
  discover("japan-horror", "일본 호러", "J-호러, 정적 속의 공포.", { lang: "ja", genres: G.horror, voteGte: 150 }),
  discover("france-crime", "프랑스 누아르", "쿨한 범죄와 멜랑콜리.", { lang: "fr", genres: G.crime, voteGte: 150 }),
  discover("india-romance", "인도 로맨스", "노래와 함께 흐르는 사랑.", { lang: "hi", genres: G.romance, voteGte: 150 }),
  discover("italy-drama", "이탈리아 드라마", "삶의 무게를 담은 이탈리아 드라마.", { lang: "it", genres: G.drama, voteGte: 200 }),
  discover("scifi-2010s", "2010년대 SF", "최근 십 년의 과학소설.", { genres: G.scifi, dateGte: "2010-01-01", dateLte: "2019-12-31", voteGte: 3000 }),
  discover("animation-classics", "고전 애니메이션", "디즈니 황금기와 그 이전.", { genres: G.animation, dateLte: "1999-12-31", voteGte: 800 }),
  discover("horror-70s-80s", "70-80년대 호러", "슬래셔와 컬트 호러의 전성기.", { genres: G.horror, dateGte: "1970-01-01", dateLte: "1989-12-31", voteGte: 500 }),
  discover("war-classics", "고전 전쟁 영화", "거대한 스케일의 전쟁 서사시.", { genres: G.war, dateLte: "1999-12-31", voteGte: 400 }),
  discover("romance-classics", "고전 로맨스", "흑백 시대의 사랑 이야기.", { genres: G.romance, dateLte: "1969-12-31", voteGte: 300 }),
  discover("thriller-2000s", "2000년대 스릴러", "밀레니엄의 긴장감.", { genres: G.thriller, dateGte: "2000-01-01", dateLte: "2009-12-31", voteGte: 2000 }),
  discover("crime-90s", "90년대 범죄 영화", "타란티노 이후의 범죄 영화.", { genres: G.crime, dateGte: "1990-01-01", dateLte: "1999-12-31", voteGte: 1500 }),
  discover("scifi-classics", "고전 SF", "스페이스 오페라 이전의 상상력.", { genres: G.scifi, dateLte: "1989-12-31", voteGte: 800 }),
];

const ALL = [
  ...DIRECTORS.map(([slug, title, query, desc]) => directors(slug, title, query, desc)),
  ...GENRE_CURATIONS,
  ...COUNTRY_CURATIONS,
  ...DECADE_CURATIONS,
  ...COMBO_CURATIONS,
];

async function currentCount() {
  const r = await fetch(`${SB_URL}/rest/v1/curations?select=slug,sort_order`, { headers: sb });
  const rows = await r.json();
  return { slugs: new Set(rows.map((c) => c.slug)), max: rows.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0), n: rows.length };
}

async function main() {
  let { slugs, max, n } = await currentCount();
  console.log(`현재 큐레이션 ${n}개. 목표 ${TARGET}개.\n`);

  for (const c of ALL) {
    if (n >= TARGET) break;
    if (slugs.has(c.slug)) continue;
    process.stdout.write(`[${n + 1}] ${c.title} … `);
    let filmIds = [];
    try {
      filmIds = c.kind === "director" ? await directorFilms(c.query) : await discoverFilms(c.opts);
    } catch (e) {
      console.log(`실패(${e.message})`);
      continue;
    }
    const ok = await createCuration(
      { slug: c.slug, title: c.title, description: c.desc, sort_order: ++max },
      filmIds,
    );
    if (ok) {
      n++;
      console.log(`✓ (${filmIds.length}편)`);
    } else {
      max--;
      console.log(`스킵(영화 ${filmIds.length}편)`);
    }
    await sleep(120);
  }
  console.log(`\n완료. 현재 큐레이션 ${n}개.`);
  if (n < TARGET) console.log(`(정의된 큐레이션을 모두 소진. ${TARGET}개에 도달하려면 정의를 더 추가하세요.)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
