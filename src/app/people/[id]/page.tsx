import { notFound } from "next/navigation";
import MoviePoster from "@/components/MoviePoster";
import { getPersonDetail, tmdbConfigured } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isFinite(personId)) notFound();

  const person = await getPersonDetail(personId);
  if (!person) {
    if (!tmdbConfigured()) {
      return (
        <p className="rounded-md border border-accent/30 bg-accent/[0.06] p-6 text-sm text-bone/80">
          TMDb API 키가 없어 인물 정보를 불러올 수 없습니다.
        </p>
      );
    }
    notFound();
  }

  const roleLabel = person.role === "director" ? "감독" : "배우";

  return (
    <div className="space-y-12">
      <header className="grid gap-6 sm:grid-cols-[160px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[160px] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10">
          {person.profileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.profileUrl}
              alt={person.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl text-faint">
              {person.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div>
          <p className="kicker">{roleLabel}</p>
          <h1 className="headline mt-2 text-4xl leading-tight sm:text-5xl">
            {person.name}
          </h1>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            {person.birthday && (
              <div className="flex gap-2">
                <dt className="text-faint">출생</dt>
                <dd className="text-bone">{person.birthday}</dd>
              </div>
            )}
            {person.placeOfBirth && (
              <div className="flex gap-2">
                <dt className="text-faint">출생지</dt>
                <dd className="text-bone">{person.placeOfBirth}</dd>
              </div>
            )}
          </dl>
          {person.biography && (
            <p className="mt-4 line-clamp-6 max-w-prose text-pretty text-sm leading-relaxed text-bone/75">
              {person.biography}
            </p>
          )}
        </div>
      </header>

      <section>
        <div className="mb-5 border-b border-bone/10 pb-3">
          <p className="kicker">Filmography</p>
          <h2 className="headline mt-2 text-2xl">
            {person.role === "director" ? "감독 작품" : "출연작"}
          </h2>
        </div>
        {person.filmography.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {person.filmography.map((m) => (
              <MoviePoster
                key={m.tmdbId}
                tmdbId={m.tmdbId}
                title={m.title}
                originalTitle={m.originalTitle}
                year={m.year}
                posterUrl={m.posterUrl}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">표시할 작품이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
