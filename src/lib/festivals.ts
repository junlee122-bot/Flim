// 영화제 소개 데이터 — /festivals 페이지가 이 정의로 렌더된다.
//   matchFestivals: DB awards.festival 값과 매칭할 키워드(여러 표기 대응)
export type Festival = {
  slug: string;
  name: string; // 한글 정식 명칭
  origName: string; // 원어/영문
  badge: "oscar" | "cannes" | "venice" | "berlin" | "globe" | "bafta";
  topPrize: string; // 최고상 이름
  country: string;
  since: number;
  month: string; // 개최 시기
  blurb: string; // 한 줄 소개
  description: string; // 본문 설명
  matchFestivals: string[]; // DB awards.festival 매칭 키워드
  koreaNote?: string; // 한국 영화 관련 역사
};

export const FESTIVALS: Festival[] = [
  {
    slug: "oscar",
    name: "아카데미 시상식",
    origName: "The Academy Awards (Oscars)",
    badge: "oscar",
    topPrize: "작품상 (Best Picture)",
    country: "미국",
    since: 1929,
    month: "매년 2~3월",
    blurb: "할리우드가 한 해를 결산하는 가장 영향력 있는 시상식.",
    description:
      "미국 영화예술과학아카데미(AMPAS)가 주관하는 세계에서 가장 널리 알려진 영화 시상식이에요. 흔히 ‘오스카’라 불리는 황금빛 트로피로 상징되며, 작품상·감독상·연기상 등 24개 부문을 시상합니다. 1929년 처음 열린 이래 영화 산업의 한 해를 결산하는 행사로 자리 잡았어요. 경쟁 영화제(칸·베니스·베를린)와 달리 ‘시상식’ 성격이 강해, 그해 개봉한 영화를 대상으로 회원 투표로 수상작을 정합니다.",
    matchFestivals: ["아카데미", "오스카", "Academy", "Oscar"],
    koreaNote: "2020년 봉준호 감독의 〈기생충〉이 비영어 영화 최초로 작품상을 받으며 감독상·각본상·국제장편영화상까지 4관왕을 기록했어요. 2021년에는 윤여정이 〈미나리〉로 한국 배우 최초 여우조연상을 수상했습니다.",
  },
  {
    slug: "cannes",
    name: "칸 영화제",
    origName: "Festival de Cannes",
    badge: "cannes",
    topPrize: "황금종려상 (Palme d’Or)",
    country: "프랑스",
    since: 1946,
    month: "매년 5월",
    blurb: "예술 영화의 최고 권위. 세계 3대 영화제의 정점.",
    description:
      "프랑스 남부 휴양지 칸에서 매년 5월 열리는, 세계에서 가장 권위 있는 영화제예요. 최고상인 ‘황금종려상(Palme d’Or)’은 종려나무 잎을 형상화한 트로피로, 작가주의 예술 영화의 정점으로 평가받습니다. 봉준호 감독의 〈기생충〉이 2019년 한국 영화 최초로 황금종려상을 받았고, 이듬해 아카데미 작품상까지 석권하며 화제가 됐죠. 비경쟁 부문, 주목할 만한 시선, 감독주간 등 다양한 섹션으로도 유명합니다.",
    matchFestivals: ["칸", "Cannes"],
    koreaNote: "2019년 봉준호 감독의 〈기생충〉이 한국 영화 최초로 황금종려상을 받았어요. 그 전에도 박찬욱(〈올드보이〉 심사위원대상, 〈헤어질 결심〉 감독상), 이창동, 임권택(감독상) 등 한국 영화가 꾸준히 본상을 받아왔습니다.",
  },
  {
    slug: "venice",
    name: "베니스 영화제",
    origName: "Mostra Internazionale d’Arte Cinematografica",
    badge: "venice",
    topPrize: "황금사자상 (Leone d’Oro)",
    country: "이탈리아",
    since: 1932,
    month: "매년 8~9월",
    blurb: "세계에서 가장 오래된 영화제. 황금사자의 도시.",
    description:
      "1932년 시작된 세계에서 가장 오래된 국제 영화제예요. 이탈리아 베네치아(베니스)에서 매년 8~9월에 열리며, 최고상은 베네치아의 상징인 사자를 형상화한 ‘황금사자상(Leone d’Oro)’입니다. 가을 시상식 시즌의 문을 여는 영화제로, 이곳에서 호평받은 작품이 그해 오스카 후보로 이어지는 경우가 많아 ‘오스카의 전초전’으로도 불립니다.",
    matchFestivals: ["베니스", "베네치아", "Venice", "Venezia"],
    koreaNote: "2012년 김기덕 감독의 〈피에타〉가 한국 영화 최초로 황금사자상을 받았어요. 한국 영화가 받은 첫 세계 3대 영화제 최고상입니다.",
  },
  {
    slug: "berlin",
    name: "베를린 영화제",
    origName: "Berlinale (Internationale Filmfestspiele Berlin)",
    badge: "berlin",
    topPrize: "황금곰상 (Goldener Bär)",
    country: "독일",
    since: 1951,
    month: "매년 2월",
    blurb: "사회·정치적 메시지를 품은 영화의 무대.",
    description:
      "독일 베를린에서 매년 2월 열리는 영화제로, 도시의 상징인 곰을 형상화한 ‘황금곰상(Goldener Bär)’이 최고상이에요. 칸·베니스와 함께 세계 3대 영화제로 꼽히며, 특히 사회적·정치적 주제를 다루는 영화에 주목하는 전통이 강합니다. 대중에게도 개방적인 운영으로 ‘관객의 영화제’라는 별칭도 있어요.",
    matchFestivals: ["베를린", "Berlin", "Berlinale"],
    koreaNote: "2007년 박찬욱 감독이 〈싸이보그지만 괜찮아〉로 알프레드 바우어상을, 2020·2021·2022년에는 홍상수 감독이 감독상·각본상·심사위원대상을 잇따라 받으며 베를린의 단골 수상자가 되었어요.",
  },
];

FESTIVALS.push(
  {
    slug: "globe",
    name: "골든 글로브",
    origName: "Golden Globe Awards",
    badge: "globe",
    topPrize: "작품상 (드라마/뮤지컬·코미디)",
    country: "미국",
    since: 1944,
    month: "매년 1월",
    blurb: "할리우드 외신기자단이 뽑는, 오스카의 풍향계.",
    description:
      "미국에서 활동하는 외신기자단(HFPA)이 영화와 TV를 함께 시상하는 행사예요. 매년 1월에 열려 시상식 시즌의 문을 열고, 결과가 그해 아카데미를 가늠하는 지표로 자주 인용됩니다. 영화 부문은 ‘드라마’와 ‘뮤지컬·코미디’를 나눠 작품상을 시상하는 점이 독특해요. 시상식 분위기가 자유롭기로도 유명합니다.",
    matchFestivals: ["골든글로브", "골든 글로브", "Golden Globe"],
    koreaNote: "2021년 정이삭 감독의 〈미나리〉가 외국어영화상을 받았고, 2022년 〈오징어 게임〉의 오영수가 한국 배우 최초로 TV 부문 남우조연상을 수상했어요.",
  },
  {
    slug: "bafta",
    name: "영국 아카데미 (BAFTA)",
    origName: "British Academy Film Awards",
    badge: "bafta",
    topPrize: "작품상 (Best Film)",
    country: "영국",
    since: 1949,
    month: "매년 2월",
    blurb: "영국 영화·TV 예술의 최고 권위. ‘영국의 오스카’.",
    description:
      "영국 영화텔레비전예술아카데미(BAFTA)가 주관하는 시상식으로, 가면 형태의 트로피로 상징돼요. ‘영국의 오스카’로 불리며, 아카데미 직전에 열려 수상 결과가 오스카와 자주 겹칩니다. 영국 영화에 주는 별도 부문이 있는 것도 특징이에요.",
    matchFestivals: ["BAFTA", "영국 아카데미"],
    koreaNote: "2020년 봉준호 감독의 〈기생충〉이 외국어영화상과 각본상을 받았어요.",
  },
);

export function getFestival(slug: string): Festival | undefined {
  return FESTIVALS.find((f) => f.slug === slug);
}
