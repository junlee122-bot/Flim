import type { RawSearchResult } from "./provider";
import type { ReviewCandidate } from "@/types";

// =============================================================
// 평론가 평 자동검색 파서
//  - 저작권 준수: 전문 미수집. 스니펫에서 "짧은 한줄평/별점"만 추출.
//  - 출처 우선순위로 confidence 가중.
// =============================================================

// 평론가 이름 + 영화 제목으로 검색 쿼리 조합
export function buildQueries(criticName: string, title: string): string[] {
  return [
    `${criticName} ${title} 별점`,
    `${criticName} ${title} 한줄평`,
    `씨네21 ${criticName} ${title}`,
  ];
}

// 출처 우선순위 → 가중치 (0~1)
type SourceTier = { weight: number; name: string };

function classifySource(url: string): SourceTier {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  // 1순위: 씨네21 / 공식 매체
  if (host.includes("cine21")) return { weight: 1.0, name: "씨네21" };
  if (
    host.includes("maxmovie") ||
    host.includes("movist") ||
    host.includes("chosun") ||
    host.includes("hani") ||
    host.includes("hankyung") ||
    host.includes("joins") ||
    host.includes("donga")
  )
    return { weight: 0.85, name: host };

  // 2순위: 왓챠피디아 / 네이버 / 다음
  if (host.includes("pedia.watcha") || host.includes("watcha"))
    return { weight: 0.7, name: "왓챠피디아" };
  if (host.includes("naver")) return { weight: 0.6, name: "네이버" };
  if (host.includes("daum") || host.includes("tistory"))
    return { weight: 0.5, name: host };

  // 3순위: 개인 블로그 / 커뮤니티 (참고용)
  return { weight: 0.3, name: host || "기타" };
}

// 별점 후보 추출 → 5점 만점으로 정규화
export function extractRating(text: string): number | null {
  // ★ 기호
  const stars = (text.match(/★/g) || []).length;
  const halfStar = /½|☆/.test(text) ? 0.5 : 0;
  if (stars > 0 && stars <= 5) return Math.min(5, stars + halfStar);

  // "4.5/5", "4/5", "8/10"
  const frac = text.match(/(\d(?:\.\d)?)\s*\/\s*(5|10)/);
  if (frac) {
    const v = parseFloat(frac[1]);
    const base = parseInt(frac[2], 10);
    return Math.round((base === 10 ? v / 2 : v) * 10) / 10;
  }

  // "별점 4.5", "평점 4"
  const labeled = text.match(/(?:별점|평점)\s*[:：]?\s*(\d(?:\.\d)?)/);
  if (labeled) {
    const v = parseFloat(labeled[1]);
    return v > 5 ? Math.round((v / 2) * 10) / 10 : v;
  }
  return null;
}

// 한줄평 후보 추출: 따옴표로 감싼 짧은 문장 우선, 없으면 스니펫을 잘라 요약처럼.
export function extractShortQuote(snippet: string): string | null {
  const quoted = snippet.match(/[""“”'’](.{4,60}?)[""“”'’]/);
  if (quoted) return quoted[1].trim();

  // 첫 문장 (마침표 기준), 60자 이내로 제한
  const sentence = snippet.split(/[.。!?\n]/)[0]?.trim();
  if (sentence && sentence.length >= 6 && sentence.length <= 60) return sentence;
  return null;
}

// 스니펫을 80자 이내 요약으로 (전문 복사 방지)
function makeSummary(snippet: string): string {
  const clean = snippet.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? clean.slice(0, 80) + "…" : clean;
}

// 결과 1건 → 후보 1건
function toCandidate(
  r: RawSearchResult,
  criticName: string,
  title: string,
): ReviewCandidate {
  const tier = classifySource(r.url);
  const haystack = `${r.title} ${r.snippet}`;
  const rating = extractRating(haystack);
  const shortQuote = extractShortQuote(r.snippet);

  // confidence: 출처가중 + 평론가명/제목 매칭 + 별점/한줄평 존재 보너스
  let conf = tier.weight * 0.6;
  if (haystack.includes(criticName)) conf += 0.2;
  if (title && haystack.includes(title)) conf += 0.1;
  if (rating !== null) conf += 0.05;
  if (shortQuote) conf += 0.05;
  conf = Math.min(1, Math.round(conf * 100) / 100);

  return {
    criticName,
    sourceName: tier.name,
    sourceUrl: r.url,
    rating,
    shortQuote,
    summary: makeSummary(r.snippet),
    confidenceScore: conf,
  };
}

// 여러 검색 결과 묶음 → 정제된 후보 목록 (중복 URL 제거, confidence 내림차순)
export function parseResults(
  results: RawSearchResult[],
  criticName: string,
  title: string,
): ReviewCandidate[] {
  const seen = new Set<string>();
  const out: ReviewCandidate[] = [];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    const haystack = `${r.title} ${r.snippet}`;
    // 평론가 이름이 전혀 안 보이면 신뢰도가 낮으므로 스킵
    if (!haystack.includes(criticName)) continue;
    out.push(toCandidate(r, criticName, title));
  }
  return out.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 10);
}
