"use client";

import { useState } from "react";
import { useUserData } from "@/components/UserDataProvider";

// 내 별점 매기기 (0.5 단위). 로그인 시 서버 동기화, 아니면 로컬 저장.
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
  const { ready, ratings, rate, unrate } = useUserData();
  const [hover, setHover] = useState(0);

  if (!ready) return null;
  const value = ratings[tmdbId]?.rating ?? 0;

  function pick(v: number) {
    if (v === value) unrate(tmdbId);
    else rate(tmdbId, v, { title, posterUrl, year });
  }

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
        {[1, 2, 3, 4, 5].map((n) => (
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
        ))}
      </div>
      {value > 0 && (
        <span className="text-sm tabular-nums text-accent">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
