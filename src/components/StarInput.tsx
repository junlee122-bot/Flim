"use client";

import { useEffect, useState } from "react";
import { getRatings, setRating, removeRating } from "@/lib/userdata";

// 내 별점 매기기 (0.5 단위, localStorage 저장). 영화 상세에서 사용.
export default function StarInput({
  tmdbId,
  title,
  posterUrl,
  year,
}: {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
}) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setValue(getRatings()[tmdbId]?.rating ?? 0);
    setMounted(true);
  }, [tmdbId]);

  function pick(v: number) {
    if (v === value) {
      // 같은 값 다시 누르면 해제
      setValue(0);
      removeRating(tmdbId);
      return;
    }
    setValue(v);
    setRating({ tmdbId, title, posterUrl, year, rating: v, at: Date.now() });
  }

  if (!mounted) return null;
  const shown = hover || value;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wider text-faint">내 별점</span>
      <div
        className="flex items-center"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="내 별점"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          // 각 별을 좌(반점)/우(만점) 두 영역으로
          return (
            <span key={n} className="relative inline-flex" style={{ width: 26, height: 26 }}>
              <button
                type="button"
                aria-label={`${n - 0.5}점`}
                onMouseEnter={() => setHover(n - 0.5)}
                onClick={() => pick(n - 0.5)}
                className="absolute left-0 top-0 z-10 h-full w-1/2"
              />
              <button
                type="button"
                aria-label={`${n}점`}
                onMouseEnter={() => setHover(n)}
                onClick={() => pick(n)}
                className="absolute right-0 top-0 z-10 h-full w-1/2"
              />
              <span className="pointer-events-none text-2xl leading-none">
                <span className="text-bone/20">★</span>
                <span
                  className="absolute left-0 top-0 overflow-hidden text-accent"
                  style={{ width: `${Math.min(1, Math.max(0, shown - (n - 1))) * 100}%` }}
                >
                  ★
                </span>
              </span>
            </span>
          );
        })}
      </div>
      {value > 0 && (
        <span className="text-sm tabular-nums text-accent">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
