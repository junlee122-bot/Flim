import PosterGridSkeleton from "@/components/PosterGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="animate-pulse border-b border-bone/10 pb-6">
        <div className="h-3 w-20 rounded bg-ink-800" />
        <div className="mt-3 h-10 w-64 rounded bg-ink-800" />
        <div className="mt-4 h-3 w-48 rounded bg-ink-800/70" />
      </div>
      <PosterGridSkeleton count={18} />
    </div>
  );
}
