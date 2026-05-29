// 포스터 그리드 로딩 스켈레톤 (펄스 애니메이션).
export default function PosterGridSkeleton({
  count = 12,
  cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid gap-x-5 gap-y-8 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] w-full rounded-md bg-ink-800" />
          <div className="mt-2.5 h-3 w-3/4 rounded bg-ink-800" />
          <div className="mt-1.5 h-2.5 w-1/2 rounded bg-ink-800/70" />
        </div>
      ))}
    </div>
  );
}
