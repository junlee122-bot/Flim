// 장르 허브 설정 — /genre/[slug] 가 이 정의로 렌더된다.
//   genres: movies.genres 와 매칭할 한글 장르명(OR)
//   curations: 허브 상단에 띄울 관련 큐레이션 slug (있는 것만)
//   subFilters: 하위 필터(언어 등) — 칩으로 노출
export type GenreHub = {
  slug: string;
  label: string; // nav/제목
  kicker: string;
  title: string; // 히어로 헤드라인
  description: string;
  genres: string[];
  curations: string[];
  subFilters?: { key: string; label: string; lang?: string; genres?: string[] }[];
};

export const GENRE_HUBS: GenreHub[] = [
  {
    slug: "animation",
    label: "애니메이션",
    kicker: "Animation",
    title: "그림이 도달한 예술, 애니메이션",
    description:
      "지브리의 손그림부터 신카이 마코토의 빛, 곤 사토시의 환상까지. 장르의 경계를 넘는 애니메이션.",
    genres: ["애니메이션"],
    curations: [
      "genre-animation", "japan-animation", "animation-classics",
      "ghibli", "miyazaki", "shinkai", "kon", "hosoda", "miyazaki-isao",
    ],
    subFilters: [
      { key: "jp", label: "일본", lang: "ja" },
      { key: "us", label: "서양", lang: "en" },
    ],
  },
  {
    slug: "scifi",
    label: "SF",
    kicker: "Science Fiction",
    title: "미래를 빌려 현재를 묻다, SF",
    description:
      "블레이드 러너에서 컨택트까지. 과학소설이 도달한 상상력의 정점.",
    genres: ["SF"],
    curations: ["genre-scifi", "scifi-2010s", "scifi-classics", "sci-fi-masterpieces", "villeneuve", "nolan"],
  },
  {
    slug: "horror",
    label: "호러",
    kicker: "Horror",
    title: "공포라는 장르의 가장 깊은 곳",
    description:
      "고전 괴기에서 동시대 작가주의 호러까지. 불안과 전율의 미학.",
    genres: ["공포"],
    curations: ["genre-horror", "horror-70s-80s", "studio-a24-recent", "japan-horror", "ari-aster"],
    subFilters: [
      { key: "kr", label: "한국", lang: "ko" },
      { key: "jp", label: "일본", lang: "ja" },
      { key: "us", label: "서양", lang: "en" },
    ],
  },
  {
    slug: "documentary",
    label: "다큐멘터리",
    kicker: "Documentary",
    title: "현실이 가장 강력한 드라마일 때",
    description: "세상을 응시하는 카메라. 사실이 빚어내는 이야기.",
    genres: ["다큐멘터리"],
    curations: ["genre-documentary"],
  },
  {
    slug: "thriller",
    label: "스릴러",
    kicker: "Thriller",
    title: "긴장의 끈을 놓을 수 없는",
    description: "범죄와 미스터리, 심리의 칼날. 장르의 쾌감이 정점에 이를 때.",
    genres: ["스릴러", "미스터리"],
    curations: ["genre-thriller", "genre-mystery", "genre-crime", "thriller-2000s", "korea-thriller", "fincher"],
    subFilters: [
      { key: "crime", label: "범죄", genres: ["범죄"] },
      { key: "mystery", label: "미스터리", genres: ["미스터리"] },
      { key: "action", label: "액션", genres: ["액션"] },
    ],
  },
  {
    slug: "romance",
    label: "로맨스",
    kicker: "Romance",
    title: "사랑의 모든 결",
    description: "설렘과 이별, 애틋함까지. 마음을 움직이는 멜로의 명작들.",
    genres: ["로맨스"],
    curations: ["genre-romance", "romance-classics", "india-romance"],
  },
  {
    slug: "action",
    label: "액션",
    kicker: "Action",
    title: "순수한 운동 에너지, 액션",
    description: "총격과 추격, 육탄전. 스크린을 가르는 운동의 쾌감.",
    genres: ["액션"],
    curations: ["genre-action", "heist", "leone", "refn"],
  },
  {
    slug: "comedy",
    label: "코미디",
    kicker: "Comedy",
    title: "웃음 뒤에 남는 것",
    description: "유쾌한 소동부터 씁쓸한 풍자까지. 희극이 도달한 깊이.",
    genres: ["코미디"],
    curations: ["genre-comedy", "coen-brothers", "wes-anderson"],
  },
  {
    slug: "war",
    label: "전쟁",
    kicker: "War",
    title: "전장의 참혹과 인간",
    description: "포화 속의 휴머니즘. 반전(反戰)의 기록이 된 걸작들.",
    genres: ["전쟁"],
    curations: ["genre-war", "war-classics"],
  },
  {
    slug: "western",
    label: "서부극",
    kicker: "Western",
    title: "황야와 총잡이, 미국이라는 신화",
    description: "석양의 결투에서 수정주의 웨스턴까지. 장르의 원형.",
    genres: ["서부"],
    curations: ["genre-western", "leone"],
  },
  {
    slug: "crime",
    label: "범죄",
    kicker: "Crime",
    title: "범죄와 그 그림자",
    description: "느와르와 갱스터, 케이퍼. 어둠을 응시하는 장르.",
    genres: ["범죄"],
    curations: ["genre-crime", "heist", "korea-crime", "france-crime", "scorsese", "coen-brothers"],
  },
  {
    slug: "fantasy",
    label: "판타지",
    kicker: "Fantasy",
    title: "현실 너머의 세계",
    description: "신화와 마법, 또 다른 세계로의 초대.",
    genres: ["판타지"],
    curations: ["genre-fantasy", "del-toro"],
  },
  {
    slug: "drama",
    label: "드라마",
    kicker: "Drama",
    title: "삶을 가장 진하게",
    description: "인간과 삶을 응시하는 가장 넓고 깊은 장르.",
    genres: ["드라마"],
    curations: ["genre-drama", "lee-chang-dong", "kore-eda", "bergman"],
  },
];

export function getGenreHub(slug: string): GenreHub | undefined {
  return GENRE_HUBS.find((h) => h.slug === slug);
}
