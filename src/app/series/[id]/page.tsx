import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesDetail, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSeriesDetail(Number(id));
  return s ? { title: s.name } : {};
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) notFound();
  const s = await getSeriesDetail(tmdbId);
  if (!s) {
    if (!tmdbConfigured())
      return <p className="rounded-md border border-accent/30 bg-accent/[0.06] p-6 text-sm text-bone/80">TMDb API 키가 없어 정보를 불러올 수 없습니다.</p>;
    notFound();
  }
  const period = s.year ? (s.lastYear && s.lastYear !== s.year ? `${s.year}–${s.lastYear}` : `${s.year}`) : null;

  return (
    <article className="space-y-16">
      {/* Hero */}
      <header className="relative -mx-5 -mt-12 overflow-hidden px-5 pb-2 pt-12 sm:-mx-8 sm:px-8">
        {s.backdropUrl && (
          <div className="pointer-events-none absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.backdropUrl} alt="" className="h-full w-full object-cover object-top opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/70 to-transparent" />
          </div>
        )}
        <Link href="/tv" className="link-underline text-xs text-muted">← TV 시리즈</Link>
        <div className="mt-6 grid gap-8 sm:grid-cols-[240px_1fr]">
          <div className="aspect-[2/3] w-full max-w-[240px] overflow-hidden rounded-md bg-ink-800 shadow-2xl shadow-black/50 ring-1 ring-bone/10">
            {s.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.posterUrl} alt={s.name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="space-y-5">
            <div>
              <span className="badge">TV 시리즈</span>
              <h1 className="headline mt-3 text-balance text-4xl leading-[1.1] sm:text-5xl">
                {s.name}
                {period ? <span className="font-light text-muted"> ({period})</span> : null}
              </h1>
              {s.originalName !== s.name && <p className="mt-2 text-lg italic text-muted">{s.originalName}</p>}
              {s.tagline && <p className="mt-3 max-w-xl text-pretty font-serif text-base italic text-accent-soft">“{s.tagline}”</p>}
            </div>
            {s.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">{s.genres.map((g) => <span key={g} className="chip">{g}</span>)}</div>
            )}
            <dl className="grid max-w-xl grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
              <Info label="제작" value={s.creators.join(", ") || null} />
              <Info label="채널" value={s.networks.join(", ") || null} />
              <Info label="시즌" value={s.seasons ? `${s.seasons}시즌` : null} />
              <Info label="에피소드" value={s.episodes ? `${s.episodes}화` : null} />
              <Info label="출연" value={s.cast.slice(0, 4).map((c) => c.name).join(", ") || null} wide />
            </dl>
            {s.tmdbRating != null && (
              <div className="rounded-md border border-bone/20 bg-ink-900 px-3.5 py-2 text-center w-fit">
                <p className="text-[0.6rem] uppercase tracking-wider text-faint">TMDb</p>
                <p className="mt-1 text-sm font-medium tabular-nums text-bone">{s.tmdbRating}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {s.overview && (
        <Section title="줄거리" kicker="Synopsis">
          <p className="max-w-prose text-pretty text-lg leading-relaxed text-bone/85">{s.overview}</p>
        </Section>
      )}

      {s.trailerKey && (
        <Section title="예고편" kicker="Trailer">
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-md ring-1 ring-bone/10">
            <iframe src={`https://www.youtube-nocookie.com/embed/${s.trailerKey}`} title={`${s.name} 예고편`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" className="h-full w-full" />
          </div>
        </Section>
      )}

      {s.cast.length > 0 && (
        <Section title="출연진" kicker="Cast">
          <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
            {s.cast.map((c) => (
              <li key={`${c.id}-${c.character ?? ""}`}>
                <Link href={`/people/${c.id}`} className="group block text-center">
                  <div className="mx-auto aspect-square w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/50">
                    {c.profileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.profileUrl} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : <div className="flex h-full items-center justify-center text-2xl text-faint">{c.name.slice(0,1)}</div>}
                  </div>
                  <p className="mt-2 truncate text-sm text-bone group-hover:text-accent-soft">{c.name}</p>
                  {c.character && <p className="truncate text-xs text-muted">{c.character}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.stills.length > 0 && (
        <Section title="스틸컷" kicker="Stills">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {s.stills.map((x) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={x} src={x} alt="" className="aspect-video w-full rounded-md object-cover ring-1 ring-bone/10" loading="lazy" />
            ))}
          </div>
        </Section>
      )}

      {s.similar.length > 0 && (
        <Section title="비슷한 시리즈" kicker="You Might Also Like">
          <div className="grid grid-cols-3 gap-x-5 gap-y-8 sm:grid-cols-6">
            {s.similar.map((x) => (
              <Link key={x.tmdbId} href={`/series/${x.tmdbId}`} className="group block">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition group-hover:ring-accent/40">
                  {x.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.posterUrl} alt={x.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  )}
                </div>
                <p className="mt-2 truncate text-sm text-bone group-hover:text-accent-soft">{x.name}</p>
                {x.year ? <p className="text-xs text-muted">{x.year}</p> : null}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Info({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 text-bone">{value ?? "—"}</dd>
    </div>
  );
}
function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-up">
      <div className="mb-5 border-b border-bone/10 pb-3">
        <p className="kicker">{kicker}</p>
        <h2 className="headline mt-2 text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
