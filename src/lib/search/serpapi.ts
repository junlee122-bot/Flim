import type { SearchProvider, RawSearchResult } from "./provider";

// SerpAPI (Google 검색 결과 프록시)
export class SerpApiProvider implements SearchProvider {
  name = "serpapi";
  async search(query: string): Promise<RawSearchResult[]> {
    const key = process.env.SERPAPI_KEY;
    if (!key) return [];
    const url = `https://serpapi.com/search.json?engine=google&hl=ko&gl=kr&num=10&q=${encodeURIComponent(
      query,
    )}&api_key=${key}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as {
        organic_results?: { title: string; link: string; snippet?: string }[];
      };
      return (data.organic_results ?? []).map((i) => ({
        title: i.title,
        url: i.link,
        snippet: i.snippet ?? "",
      }));
    } catch {
      return [];
    }
  }
}
