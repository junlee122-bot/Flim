import type { SearchProvider, RawSearchResult } from "./provider";

// Google Programmable Search (Custom Search JSON API)
export class GoogleProvider implements SearchProvider {
  name = "google";
  async search(query: string): Promise<RawSearchResult[]> {
    const key = process.env.GOOGLE_CSE_KEY;
    const cx = process.env.GOOGLE_CSE_CX;
    if (!key || !cx) return [];
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=10&q=${encodeURIComponent(
      query,
    )}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = (await res.json()) as {
        items?: { title: string; link: string; snippet?: string }[];
      };
      return (data.items ?? []).map((i) => ({
        title: i.title,
        url: i.link,
        snippet: i.snippet ?? "",
      }));
    } catch {
      return [];
    }
  }
}
