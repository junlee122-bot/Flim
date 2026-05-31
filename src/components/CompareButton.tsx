"use client";

import { useRouter } from "next/navigation";

const KEY = "flim_compare_a";

// 비교에 추가 — 첫 클릭 시 이 영화를 담고, 다른 영화에서 누르면 비교 페이지로.
export default function CompareButton({ tmdbId }: { tmdbId: number }) {
  const router = useRouter();
  function onClick() {
    const a = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!a) {
      localStorage.setItem(KEY, String(tmdbId));
      alert("비교 목록에 담았어요. 다른 영화에서 '비교에 추가'를 누르면 두 영화를 비교합니다.");
      return;
    }
    if (a === String(tmdbId)) {
      alert("이미 담긴 영화예요. 다른 영화를 골라 주세요.");
      return;
    }
    localStorage.removeItem(KEY);
    router.push(`/compare?a=${a}&b=${tmdbId}`);
  }
  return (
    <button onClick={onClick} className="btn btn-ghost py-2 text-sm">
      ⚖︎ 비교에 추가
    </button>
  );
}
