"use client";

import { useState } from "react";

// 현재 추천 조합(URL)을 복사/공유. 같은 취향 조합을 친구에게 그대로 전달.
export default function PickShare() {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    // 모바일 네이티브 공유 우선, 안 되면 클립보드 복사
    if (navigator.share) {
      try {
        await navigator.share({ title: "FLIM — 오늘 볼 영화", url });
        return;
      } catch {
        /* 사용자가 취소 → 복사로 폴백 */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 무시 */
    }
  }

  return (
    <button onClick={share} className="btn btn-ghost py-2.5">
      {copied ? "링크 복사됨 ✓" : "공유하기"}
    </button>
  );
}
