export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse border-b border-bone/10 pb-6">
        <div className="h-3 w-24 rounded bg-ink-800" />
        <div className="mt-3 h-12 w-72 rounded bg-ink-800" />
        <div className="mt-4 h-3 w-80 max-w-full rounded bg-ink-800/70" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-md border border-bone/10">
            <div className="aspect-[16/10] w-full bg-ink-800" />
            <div className="space-y-2 p-5">
              <div className="h-2.5 w-16 rounded bg-ink-800" />
              <div className="h-4 w-2/3 rounded bg-ink-800" />
              <div className="h-3 w-full rounded bg-ink-800/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
