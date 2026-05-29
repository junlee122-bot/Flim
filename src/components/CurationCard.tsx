import Link from "next/link";
import type { Curation } from "@/types";
import { CATEGORY_META, categoryOf } from "@/lib/categories";

export default function CurationCard({ curation }: { curation: Curation }) {
  const cat = CATEGORY_META[categoryOf(curation.slug)];
  return (
    <Link
      href={`/curations/${curation.slug}`}
      className="card card-hover group flex flex-col p-6"
    >
      <p className="kicker text-faint transition-colors group-hover:text-accent">
        {cat.kicker}
      </p>
      <h3 className="headline mt-3 text-xl text-bone transition-colors group-hover:text-accent-soft">
        {curation.title}
      </h3>
      {curation.description && (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
          {curation.description}
        </p>
      )}
      <span className="mt-4 text-xs text-faint transition-colors group-hover:text-muted">
        살펴보기 →
      </span>
    </Link>
  );
}
