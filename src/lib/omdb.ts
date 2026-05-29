import type { ExternalRatings } from "@/types";

// OMDb 로 외부 평점 보강. Rotten Tomatoes 는 OMDb 가 주는 경우에만 채우고,
// 없으면 "추후 연동 예정" 으로 남겨 합법적 범위만 노출한다.
export async function getExternalRatings(
  imdbId: string | null,
): Promise<ExternalRatings> {
  const fallback: ExternalRatings = {
    imdb: null,
    metacritic: null,
    rottenTomatoes: null,
  };
  const key = process.env.OMDB_API_KEY;
  if (!key || !imdbId) return fallback;

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${key}&i=${imdbId}&tomatoes=true`,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      Response: string;
      imdbRating?: string;
      Metascore?: string;
      Ratings?: { Source: string; Value: string }[];
    };
    if (data.Response === "False") return fallback;

    const rt =
      data.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value ?? null;
    return {
      imdb:
        data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null,
      metacritic:
        data.Metascore && data.Metascore !== "N/A" ? data.Metascore : null,
      rottenTomatoes: rt,
    };
  } catch {
    return fallback;
  }
}
