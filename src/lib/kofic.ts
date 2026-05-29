import type { BoxOfficeItem, KoficInfo } from "@/types";

// =============================================================
// KOFIC (영화진흥위원회) 오픈 API — 한국영화/박스오피스 보강.
//  - 일별 박스오피스
//  - 제목/연도로 한국영화 상세 보강 (개봉일/등급/제작상태 등)
// 키: KOFIC_API_KEY (.env.local)
// =============================================================

const BASE = "https://www.kobis.or.kr/kobisopenapi/webservice/rest";

export function koficConfigured() {
  return Boolean(process.env.KOFIC_API_KEY);
}

// 'YYYYMMDD' (기본값: 어제 — KOFIC 은 당일 데이터를 늦게 제공)
function defaultTargetDt(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

export async function getDailyBoxOffice(
  targetDt?: string,
): Promise<BoxOfficeItem[]> {
  const key = process.env.KOFIC_API_KEY;
  if (!key) return [];
  const dt = targetDt ?? defaultTargetDt();
  const url = `${BASE}/boxoffice/searchDailyBoxOfficeList.json?key=${key}&targetDt=${dt}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      boxOfficeResult?: {
        dailyBoxOfficeList?: {
          rank: string;
          movieNm: string;
          openDt: string;
          audiAcc: string;
          rankInten: string;
          audiCnt: string;
        }[];
      };
    };
    return (data.boxOfficeResult?.dailyBoxOfficeList ?? []).map((m) => ({
      rank: Number(m.rank),
      movieNm: m.movieNm,
      openDt: m.openDt,
      audiAcc: m.audiAcc,
      rankInten: m.rankInten,
      audiCnt: m.audiCnt,
    }));
  } catch {
    return [];
  }
}

// 제목(+개봉연도)으로 한국영화 상세 보강.
export async function getKoficMovieInfo(
  title: string,
  openYear?: number | null,
): Promise<KoficInfo | null> {
  const key = process.env.KOFIC_API_KEY;
  if (!key || !title.trim()) return null;
  try {
    // 1) 목록 검색 → movieCd
    const listUrl = `${BASE}/movie/searchMovieList.json?key=${key}&movieNm=${encodeURIComponent(
      title,
    )}&itemPerPage=10`;
    const listRes = await fetch(listUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!listRes.ok) return null;
    const listData = (await listRes.json()) as {
      movieListResult?: {
        movieList?: { movieCd: string; movieNm: string; prdtYear: string }[];
      };
    };
    const list = listData.movieListResult?.movieList ?? [];
    if (list.length === 0) return null;

    // 개봉연도 매칭 우선, 없으면 첫 결과
    const match =
      (openYear &&
        list.find((m) => Number(m.prdtYear) === openYear)) ||
      list.find((m) => m.movieNm === title) ||
      list[0];

    // 2) 상세
    const infoUrl = `${BASE}/movie/searchMovieInfo.json?key=${key}&movieCd=${match.movieCd}`;
    const infoRes = await fetch(infoUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!infoRes.ok) return null;
    const infoData = (await infoRes.json()) as {
      movieInfoResult?: {
        movieInfo?: {
          movieNm: string;
          openDt: string;
          showTm: string;
          prdtStatNm: string;
          nations?: { nationNm: string }[];
          genres?: { genreNm: string }[];
          audits?: { watchGradeNm: string }[];
          companys?: { companyNm: string; companyPartNm: string }[];
        };
      };
    };
    const info = infoData.movieInfoResult?.movieInfo;
    if (!info) return null;

    return {
      movieNm: info.movieNm,
      openDt: info.openDt
        ? `${info.openDt.slice(0, 4)}-${info.openDt.slice(4, 6)}-${info.openDt.slice(6, 8)}`
        : null,
      showTm: info.showTm || null,
      prdtStatNm: info.prdtStatNm || null,
      watchGradeNm: info.audits?.[0]?.watchGradeNm || null,
      nations: (info.nations ?? []).map((n) => n.nationNm),
      genres: (info.genres ?? []).map((g) => g.genreNm),
      companyNm:
        info.companys?.find((c) => c.companyPartNm?.includes("배급"))
          ?.companyNm ??
        info.companys?.[0]?.companyNm ??
        null,
    };
  } catch {
    return null;
  }
}

// TMDb 국가/원제로 한국영화 여부 추정
export function isLikelyKoreanFilm(
  country: string | null,
  originalTitle: string,
): boolean {
  if (country && (country.includes("한국") || country.includes("대한민국")))
    return true;
  // 원제에 한글이 포함되면 한국영화로 간주
  return /[가-힣]/.test(originalTitle);
}
