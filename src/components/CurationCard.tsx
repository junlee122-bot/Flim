import Link from "next/link";
import type { CurationWithPosters } from "@/types";
import { CATEGORY_META, categoryOf } from "@/lib/categories";

// 포스터 모자이크 카드 — 포스터가 있으면 격자로, 없으면 텍스트 카드로 폴백.
export default function CurationCard({
  curation,
}: {
  curation: CurationWithPosters;
}) {
  const cat = CATEGORY_META[categoryOf(curation.slug)];
  const posters = curation.posters ?? [];

  return (
    <Link
      href={`/curations/${curation.slug}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      {/* 포스터 모자이크 */}
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-800">
        {posters.length > 0 ? (
          <div
            className={`grid h-full w-full ${
              posters.length >= 4
                ? "grid-cols-4"
                : posters.length === 3
                  ? "grid-cols-3"
                  : posters.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
            }`}
          >
            {posters.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={p}
                alt=""
                className="h-full w-full object-cover transition duration-[800ms] ease-smooth group-hover:scale-105"
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="headline text-2xl text-faint">FLIM</span>
          </div>
        )}
        {/* 어둡게 덮어 텍스트 가독성 + 무드 */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/10 transition-opacity duration-300 group-hover:from-ink-950/90" />
        <span className="absolute right-3 top-3 rounded-full bg-ink-950/70 px-2 py-0.5 text-[0.65rem] tabular-nums text-bone/80 backdrop-blur-sm">
          {curation.count}편
        </span>
      </div>

      {/* 텍스트 */}
      <div className="flex flex-1 flex-col p-5">
        <p className="kicker text-faint transition-colors group-hover:text-accent">
          {cat.kicker}
        </p>
        <h3 className="headline mt-2 text-lg text-bone transition-colors group-hover:text-accent-soft">
          {curation.title}
        </h3>
        {curation.description && (
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
            {curation.description}
          </p>
        )}
      </div>
    </Link>
  );
}
