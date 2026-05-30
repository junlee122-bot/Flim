import Link from "next/link";
import FadeImg from "./FadeImg";

type Props = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  posterUrl?: string | null;
  meta?: string | null; // 감독·국가·장르 등 부가 정보
  rank?: number; // 순위 배지 (박스오피스/큐레이션)
};

export default function MoviePoster({
  tmdbId,
  title,
  originalTitle,
  year,
  posterUrl,
  meta,
  rank,
}: Props) {
  return (
    <Link href={`/movies/${tmdbId}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-ink-800 ring-1 ring-bone/10 transition duration-300 ease-smooth group-hover:ring-accent/40">
        {posterUrl ? (
          <FadeImg
            src={posterUrl}
            alt={`${title} 포스터`}
            className="h-full w-full object-cover transition duration-[700ms] ease-smooth group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <span className="headline text-sm text-muted">{title}</span>
          </div>
        )}

        {/* 호버 시 떠오르는 캡션 */}
        <div className="pointer-events-none absolute inset-0 flex items-end opacity-0 transition duration-300 ease-smooth group-hover:opacity-100">
          <div className="poster-veil w-full p-3">
            <p className="headline text-sm leading-snug text-bone">{title}</p>
            {year ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted">{year}</p>
            ) : null}
          </div>
        </div>

        {typeof rank === "number" && (
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink-950/80 text-xs font-semibold tabular-nums text-accent ring-1 ring-accent/40 backdrop-blur-sm">
            {rank}
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <p className="truncate text-sm text-bone transition-colors group-hover:text-accent-soft">
          {title}
          {year ? <span className="text-muted"> ({year})</span> : null}
        </p>
        {originalTitle && originalTitle !== title ? (
          <p className="truncate text-xs italic text-muted">{originalTitle}</p>
        ) : null}
        {meta ? (
          <p className="mt-0.5 truncate text-xs text-faint">{meta}</p>
        ) : null}
      </div>
    </Link>
  );
}
