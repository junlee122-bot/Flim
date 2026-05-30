"use client";

import { useEffect, useState } from "react";

// 일정 이상 스크롤하면 나타나는 '맨 위로' 버튼. 모바일 탭바 위에 위치.
export default function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-bone/15 bg-ink-900/90 text-bone shadow-lg backdrop-blur-md transition hover:border-accent/50 hover:text-accent sm:bottom-6 sm:right-6"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 14 6-6 6 6" />
      </svg>
    </button>
  );
}
