// 대용량 JSON 스냅샷을 느슨하게 선언해, TypeScript 가 거대한 리터럴 튜플
// 타입을 추론하느라 빌드가 느려지거나 메모리를 초과하는 것을 막는다.
// 실제 타입은 src/lib/store.ts 에서 `as unknown as ...` 로 부여한다.
declare module "@/data/movies.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/series.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/curations.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/curation_movies.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/awards.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/critic_reviews.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/daily_picks.json" {
  const v: unknown[];
  export default v;
}
declare module "@/data/critics.json" {
  const v: unknown[];
  export default v;
}
