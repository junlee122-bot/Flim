"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useUserData } from "@/components/UserDataProvider";

// "봤어요" 토글. 컨텍스트(로컬/서버 동기화)에 저장하고,
// /pick 의 ?seen= 도 갱신해 다음 추천에서 제외되게 한다.
export default function WatchedToggle({
  tmdbId,
  title,
}: {
  tmdbId: number;
  title: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, watched, toggleWatched } = useUserData();

  if (!ready) return null;
  const isWatched = watched.includes(tmdbId);

  function onClick() {
    toggleWatched(tmdbId, { title, posterUrl: null, year: null });
    const next = isWatched
      ? watched.filter((x) => x !== tmdbId)
      : [...watched, tmdbId];
    const sp = new URLSearchParams(params.toString());
    if (next.length) sp.set("seen", next.join(","));
    else sp.delete("seen");
    router.replace(`/pick?${sp.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        isWatched
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-bone/15 text-muted hover:border-bone/40 hover:text-bone"
      }`}
      aria-pressed={isWatched}
      title={`${title} ${isWatched ? "본 영화 해제" : "봤어요 표시"}`}
    >
      {isWatched ? "✓ 봤어요" : "+ 봤어요"}
    </button>
  );
}
