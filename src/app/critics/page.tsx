import Link from "next/link";
import { getCriticStats } from "@/lib/data";
import { DEFAULT_CRITICS } from "@/lib/critics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "평론가",
  description: "이동진·박평식·김혜리 등 평론가별 별점과 한줄평 모아보기.",
};

const slugOf = (name: string) =>
  DEFAULT_CRITICS.find((c) => c.name === name)?.slug ??
  encodeURIComponent(name);

export default async function CriticsIndex() {
  const stats = await getCriticStats();

  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Critics</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          평론가
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          평론가가 어떤 영화에 별을 몇 개 줬는지. 한 사람의 시선으로 영화를
          따라가 보세요. (출처: 씨네21)
        </p>
      </header>

      {stats.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {stats.map((c) => (
            <Link
              key={c.name}
              href={`/critics/${slugOf(c.name)}`}
              className="card card-hover group flex items-center gap-5 p-6"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-800 text-2xl text-accent ring-1 ring-bone/10">
                {c.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="headline text-xl text-bone transition-colors group-hover:text-accent-soft">
                  {c.name}
                </h2>
                <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                  <span>평론 {c.count}편</span>
                  {c.avg > 0 && (
                    <span className="text-accent">평균 ★ {c.avg}</span>
                  )}
                </p>
              </div>
              <span className="text-faint transition-colors group-hover:text-accent">
                →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center text-sm text-muted">
          아직 등록된 평론이 없습니다.
        </p>
      )}
    </div>
  );
}
