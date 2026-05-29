import type { SearchProvider } from "./provider";
import { GoogleProvider } from "./google";
import { SerpApiProvider } from "./serpapi";
import { BraveProvider } from "./brave";

// SEARCH_PROVIDER env 로 구현체를 선택한다. 기본값 brave.
export function getSearchProvider(): SearchProvider {
  const choice = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  switch (choice) {
    case "google":
      return new GoogleProvider();
    case "serpapi":
      return new SerpApiProvider();
    case "brave":
    default:
      return new BraveProvider();
  }
}

export function searchProviderConfigured(): boolean {
  const choice = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  if (choice === "google")
    return Boolean(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX);
  if (choice === "serpapi") return Boolean(process.env.SERPAPI_KEY);
  return Boolean(process.env.BRAVE_SEARCH_KEY);
}

export type { SearchProvider, RawSearchResult } from "./provider";
