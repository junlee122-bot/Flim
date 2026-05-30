import type { Curation } from "@/types";

// slug 패턴으로 큐레이션을 카테고리로 분류한다.
//   genre-*  → 장르
//   cinema-* → 국가/지역
//   decade-* → 연대
//   그 외 (감독 slug, 테마)  → 감독·테마
export type CategoryKey =
  | "director"
  | "actor"
  | "craft"
  | "genre"
  | "country"
  | "decade"
  | "theme";

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; kicker: string; order: number }
> = {
  theme: { label: "테마 컬렉션", kicker: "Themes", order: 0 },
  director: { label: "감독전", kicker: "Auteurs", order: 1 },
  actor: { label: "배우전", kicker: "Stars", order: 2 },
  craft: { label: "촬영·음악", kicker: "Craft", order: 3 },
  genre: { label: "장르", kicker: "Genres", order: 4 },
  country: { label: "나라별 영화", kicker: "World Cinema", order: 5 },
  decade: { label: "연대별", kicker: "Decades", order: 6 },
};

// 테마(감독전이 아닌 손수 만든 컬렉션) slug 화이트리스트
const THEME_SLUGS = new Set([
  "near-perfect",
  "lee-dong-jin-perfect",
  "critics-perfect",
  "intro-classics",
  "cannes-palme-dor",
  "a24",
  "hk-90s",
  "nouvelle-vague",
  "italian-neorealism",
  "film-noir",
  "sci-fi-masterpieces",
  "animation-beyond-ghibli",
  "studio-a24-recent",
  "ghibli",
  "tarkovsky",
  "iranian-cinema",
  // 조합형(combo) 큐레이션
  "japan-animation",
  "korea-thriller",
  "korea-crime",
  "japan-horror",
  "france-crime",
  "india-romance",
  "italy-drama",
  "scifi-2010s",
  "animation-classics",
  "horror-70s-80s",
  "war-classics",
  "romance-classics",
  "thriller-2000s",
  "crime-90s",
  "scifi-classics",
]);

export function categoryOf(slug: string): CategoryKey {
  if (slug.startsWith("actor-")) return "actor";
  if (slug.startsWith("dop-") || slug.startsWith("composer-")) return "craft";
  if (slug.startsWith("genre-")) return "genre";
  if (slug.startsWith("cinema-")) return "country";
  if (slug.startsWith("decade-")) return "decade";
  if (THEME_SLUGS.has(slug)) return "theme";
  return "director";
}

export type GroupedCurations<T extends { slug: string } = Curation> = {
  key: CategoryKey;
  label: string;
  kicker: string;
  items: T[];
}[];

export function groupCurations<T extends { slug: string }>(
  curations: T[],
): GroupedCurations<T> {
  const buckets = new Map<CategoryKey, T[]>();
  for (const c of curations) {
    const k = categoryOf(c.slug);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(c);
  }
  return (Object.keys(CATEGORY_META) as CategoryKey[])
    .map((key) => ({
      key,
      label: CATEGORY_META[key].label,
      kicker: CATEGORY_META[key].kicker,
      items: buckets.get(key) ?? [],
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => CATEGORY_META[a.key].order - CATEGORY_META[b.key].order);
}
