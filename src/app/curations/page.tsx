import Link from "next/link";
import CurationCard from "@/components/CurationCard";
import { getCurationsWithPosters } from "@/lib/data";
import {
  CATEGORY_META,
  categoryOf,
  groupCurations,
  type CategoryKey,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

const TABS: { key: CategoryKey | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "theme", label: CATEGORY_META.theme.label },
  { key: "director", label: CATEGORY_META.director.label },
  { key: "actor", label: CATEGORY_META.actor.label },
  { key: "genre", label: CATEGORY_META.genre.label },
  { key: "country", label: CATEGORY_META.country.label },
  { key: "decade", label: CATEGORY_META.decade.label },
];

export default async function CurationsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat = "all" } = await searchParams;
  const curations = await getCurationsWithPosters();
  const grouped = groupCurations(curations);

  const activeCat = TABS.some((t) => t.key === cat) ? cat : "all";
  const filtered =
    activeCat === "all"
      ? curations
      : curations.filter((c) => categoryOf(c.slug) === activeCat);

  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Curations</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          씨네필 큐레이션
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          감독전부터 장르·나라·연대까지. 보고 싶은 결을 골라 탐험하세요.
        </p>
        <p className="mt-3 text-xs tabular-nums text-faint">
          총 {curations.length}개의 컬렉션
        </p>
      </header>

      {/* 카테고리 탭 */}
      <nav className="animate-fade-up flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count =
            t.key === "all"
              ? curations.length
              : curations.filter((c) => categoryOf(c.slug) === t.key).length;
          if (count === 0) return null;
          const active = t.key === activeCat;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/curations" : `/curations?cat=${t.key}`}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs tabular-nums opacity-60">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 전체: 카테고리별 섹션 / 특정 탭: 평면 그리드 */}
      {activeCat === "all" ? (
        <div className="space-y-12">
          {grouped.map((g) => (
            <section key={g.key} id={g.key} className="scroll-mt-24">
              <div className="mb-4 flex items-baseline justify-between border-b border-bone/10 pb-2">
                <h2 className="headline text-xl">
                  <span className="kicker mr-3 align-middle">{g.kicker}</span>
                  {g.label}
                </h2>
                <span className="text-sm text-faint">{g.items.length}</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((c) => (
                  <CurationCard key={c.id} curation={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CurationCard key={c.id} curation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
