export default function Loading() {
  return (
    <div className="animate-pulse space-y-12">
      <div className="grid gap-8 pt-4 sm:grid-cols-[240px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[240px] rounded-md bg-ink-800" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded bg-ink-800" />
          <div className="h-4 w-1/2 rounded bg-ink-800/70" />
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-full bg-ink-800" />
            ))}
          </div>
          <div className="flex gap-2.5 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 w-20 rounded-md bg-ink-800" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-20 rounded bg-ink-800" />
        <div className="h-3 w-full rounded bg-ink-800/70" />
        <div className="h-3 w-5/6 rounded bg-ink-800/70" />
      </div>
    </div>
  );
}
