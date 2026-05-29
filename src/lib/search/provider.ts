// 검색 API 추상화 — Google CSE / SerpAPI / Brave 를 동일 인터페이스로 다룬다.

export type RawSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export interface SearchProvider {
  name: string;
  search(query: string): Promise<RawSearchResult[]>;
}
