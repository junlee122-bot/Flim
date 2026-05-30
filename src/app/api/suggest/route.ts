import { NextResponse } from "next/server";

// 검색 자동완성 — TMDb multi search (영화+TV+인물) 상위 결과를 가볍게 반환.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  const key = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!key && !token) return NextResponse.json({ results: [] });

  const base = "https://api.themoviedb.org/3/search/multi";
  const url = `${base}?query=${encodeURIComponent(q)}&language=ko-KR&include_adult=false${key ? `&api_key=${key}` : ""}`;
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      next: { revalidate: 60 * 10 },
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data.results ?? [])
      .filter((r: any) => ["movie", "tv", "person"].includes(r.media_type))
      .slice(0, 8)
      .map((r: any) => {
        if (r.media_type === "person")
          return {
            type: "person",
            id: r.id,
            title: r.name,
            sub: r.known_for_department === "Directing" ? "감독" : "인물",
            img: r.profile_path ? `https://image.tmdb.org/t/p/w92${r.profile_path}` : null,
          };
        const isTv = r.media_type === "tv";
        const date = isTv ? r.first_air_date : r.release_date;
        return {
          type: isTv ? "tv" : "movie",
          id: r.id,
          title: isTv ? r.name : r.title,
          sub: `${isTv ? "시리즈" : "영화"}${date ? ` · ${date.slice(0, 4)}` : ""}`,
          img: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null,
        };
      });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
