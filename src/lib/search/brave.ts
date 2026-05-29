import type { SearchProvider, RawSearchResult } from "./provider";

// Brave Search API
export class BraveProvider implements SearchProvider {
  name = "brave";
  async search(query: string): Promise<RawSearchResult[]> {
    const key = process.env.BRAVE_SEARCH_KEY;
    if (!key) return [];
    const url = `https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(
      query,
    )}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": key,
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        web?: { results?: { title: string; url: string; description?: string }[] };
      };
      return (data.web?.results ?? []).map((i) => ({
        title: i.title,
        url: i.url,
        snippet: i.description ?? "",
      }));
    } catch {
      return [];
    }
  }
}
