import PosterGridSkeleton from "@/components/PosterGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-12">
      <div className="animate-pulse pt-4">
        <div className="h-3 w-24 rounded bg-ink-800" />
        <div className="mt-3 h-12 w-80 max-w-full rounded bg-ink-800" />
        <div className="mt-4 h-3 w-96 max-w-full rounded bg-ink-800/70" />
      </div>
      <PosterGridSkeleton count={10} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
    </div>
  );
}
