import Link from "next/link";
import { notFound } from "next/navigation";
import StarRating from "@/components/StarRating";
import { getCriticReviews } from "@/lib/data";
import { DEFAULT_CRITICS } from "@/lib/critics";

export const dynamic = "force-dynamic";

function nameOf(slug: string): string {
  const c = DEFAULT_CRITICS.find((x) => x.slug === slug);
  return c?.name ?? decodeURIComponent(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${nameOf(slug)} 평론가` };
}

export default async function CriticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = nameOf(slug);
  const reviews = await getCriticReviews(name);
  if (reviews.length === 0) notFound();

  const rated = reviews.filter((r) => r.review.rating != null);
  const avg =
    rated.length > 0
      ? Math.round(
          (rated.reduce((s, r) => s + Number(r.review.rating), 0) /
            rated.length) *
            10,
        ) / 10
      : 0;
  const perfect = reviews.filter((r) => Number(r.review.rating) >= 5);

  return (
    <div className="space-y-12">
      <header className="animate-fade-up border-b border-bone/10 pb-6">
        <Link href="/critics" className="link-underline text-xs text-muted">
          ← 평론가
        </Link>
        <div className="mt-5 flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-ink-800 text-3xl text-accent ring-1 ring-bone/10">
            {name.slice(0, 1)}
          </div>
          <div>
            <p className="kicker">Critic</p>
            <h1 className="headline mt-1 text-4xl leading-tight sm:text-5xl">
              {name}
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-5 text-sm text-muted">
              <span>평론 {reviews.length}편</span>
              {avg > 0 && <span className="text-accent">평균 ★ {avg}</span>}
              {perfect.length > 0 && <span>만점 {perfect.length}편</span>}
            </p>
          </div>
        </div>
      </header>

      <section>
        <ul className="space-y-6">
          {reviews.map(({ review: r, movie }) => (
            <li key={r.id} className="flex gap-4 border-b border-bone/10 pb-6">
              <Link
                href={`/movies/${movie.tmdb_id}`}
                className="block w-16 shrink-0 sm:w-20"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-ink-800 ring-1 ring-bone/10">
                  {movie.poster_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link
                    href={`/movies/${movie.tmdb_id}`}
                    className="headline text-lg text-bone hover:text-accent-soft"
                  >
                    {movie.title}
                    {movie.release_year ? (
                      <span className="text-muted"> ({movie.release_year})</span>
                    ) : null}
                  </Link>
                  <StarRating value={r.rating} />
                </div>
                {r.short_quote && (
                  <p className="mt-2 text-pretty font-serif text-base italic text-bone/85">
                    “{r.short_quote}”
                  </p>
                )}
                {r.source_url && (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-block text-xs text-accent hover:underline"
                  >
                    {r.source_name || "원문"} →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
