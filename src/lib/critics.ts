// 자동검색 대상 평론가. DB(critics 테이블)가 없을 때의 폴백 목록.
// 추후 박평식/김혜리/정성일 외 추가는 이 배열 또는 DB 에 행을 추가하면 된다.
export const DEFAULT_CRITICS = [
  { name: "이동진", slug: "lee-dong-jin", defaultSource: "씨네21" },
  { name: "박평식", slug: "park-pyeong-sik", defaultSource: "씨네21" },
  { name: "김혜리", slug: "kim-hye-ri", defaultSource: "씨네21" },
  { name: "정성일", slug: "jung-sung-il", defaultSource: "씨네21" },
] as const;
