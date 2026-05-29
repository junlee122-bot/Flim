// 분위기(mood) → 장르 조합 매핑. movies 테이블의 genres 만으로 근사한다.
// 각 mood 는 해당 장르들과 overlap 되는 작품을 대상으로 삼는다.
export const MOODS: { key: string; label: string; emoji: string; genres: string[] }[] = [
  { key: "warm", label: "따뜻한", emoji: "☀️", genres: ["드라마", "가족", "로맨스", "애니메이션"] },
  { key: "tense", label: "긴장되는", emoji: "🔪", genres: ["스릴러", "미스터리", "범죄", "공포"] },
  { key: "sad", label: "슬픈", emoji: "🥲", genres: ["드라마", "로맨스", "전쟁"] },
  { key: "fun", label: "유쾌한", emoji: "🎉", genres: ["코미디", "모험", "음악", "가족"] },
  { key: "thrill", label: "짜릿한", emoji: "💥", genres: ["액션", "모험", "SF"] },
  { key: "dream", label: "몽환적인", emoji: "🌌", genres: ["판타지", "SF", "애니메이션"] },
  { key: "think", label: "생각하게 하는", emoji: "🧠", genres: ["드라마", "다큐멘터리", "역사", "미스터리"] },
  { key: "scary", label: "오싹한", emoji: "👻", genres: ["공포", "스릴러"] },
];

export function moodGenres(key?: string): string[] {
  return MOODS.find((m) => m.key === key)?.genres ?? [];
}
