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
  subFilters?: { key: string; label: string; lang?: string }[];
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
];

export function getGenreHub(slug: string): GenreHub | undefined {
  return GENRE_HUBS.find((h) => h.slug === slug);
}
