import Link from "next/link";
import AwardBadge from "@/components/AwardBadge";
import { FESTIVALS } from "@/lib/festivals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "영화제",
  description: "오스카·칸·베니스·베를린 — 세계 주요 영화제 소개와 수상작.",
};

export default function FestivalsIndex() {
  return (
    <div className="space-y-10">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <p className="kicker">Film Festivals</p>
        <h1 className="headline mt-2 text-balance text-4xl leading-tight sm:text-5xl">
          세계 주요 영화제
        </h1>
        <p className="mt-4 max-w-prose text-pretty leading-relaxed text-muted">
          영화의 한 해를 빛낸 무대들. 각 영화제의 상징과 수상작을 만나보세요.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {FESTIVALS.map((f) => (
          <Link
            key={f.slug}
            href={`/festivals/${f.slug}`}
            className="card card-hover group flex items-start gap-5 p-6"
          >
            <div className="shrink-0">
              <AwardBadge festival={f.matchFestivals[0]} size={56} />
            </div>
            <div className="min-w-0">
              <h2 className="headline text-xl text-bone transition-colors group-hover:text-accent-soft">
                {f.name}
              </h2>
              <p className="text-xs uppercase tracking-wider text-faint">
                {f.origName}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.blurb}</p>
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
                <span>{f.country}</span>
                <span>· {f.since}년~</span>
                <span>· {f.month}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
