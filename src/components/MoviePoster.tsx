import Link from "next/link";

type Props = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  posterUrl?: string | null;
  meta?: string | null; // 감독·국가·장르 등 부가 정보
};

export default function MoviePoster({
  tmdbId,
  title,
  originalTitle,
  year,
  posterUrl,
  meta,
}: Props) {
  return (
    <Link href={`/movies/${tmdbId}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-ink-800 ring-1 ring-bone/10">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] group-hover:opacity-90"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted">
            {title}
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-sm text-bone">
          {title}
          {year ? (
            <span className="text-muted"> ({year})</span>
          ) : null}
        </p>
        {originalTitle && originalTitle !== title ? (
          <p className="truncate text-xs italic text-muted">{originalTitle}</p>
        ) : null}
        {meta ? <p className="mt-0.5 truncate text-xs text-muted">{meta}</p> : null}
      </div>
    </Link>
  );
}
