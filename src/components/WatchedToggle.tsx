"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getWatched as readWatched, setWatched as writeWatched } from "@/lib/userdata";

// "본 영화" 표시 토글. localStorage 에 저장하고, /pick 의 ?seen= 을 갱신해
// 서버가 다음 추천에서 제외하도록 한다.
export default function WatchedToggle({
  tmdbId,
  title,
}: {
  tmdbId: number;
  title: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setWatched(readWatched().includes(tmdbId));
  }, [tmdbId]);

  function toggle() {
    const cur = readWatched();
    const next = cur.includes(tmdbId)
      ? cur.filter((x) => x !== tmdbId)
      : [...cur, tmdbId];
    writeWatched(next);
    setWatched(!watched);
    // URL 의 seen 파라미터 동기화 (재추첨/다시 뽑기 시 제외 반영)
    const sp = new URLSearchParams(params.toString());
    if (next.length) sp.set("seen", next.join(","));
    else sp.delete("seen");
    router.replace(`/pick?${sp.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        watched
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
      }`}
      aria-pressed={watched}
      title={`${title} ${watched ? "본 영화 해제" : "봤어요 표시"}`}
    >
      {watched ? "✓ 봤어요" : "+ 봤어요"}
    </button>
  );
}
