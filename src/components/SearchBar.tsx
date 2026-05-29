"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({
  initial = "",
  autoFocus = false,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="group relative flex w-full items-center"
      role="search"
    >
      {/* 돋보기 아이콘 */}
      <svg
        className="pointer-events-none absolute left-4 h-5 w-5 text-muted transition-colors group-focus-within:text-accent"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>

      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="영화 제목으로 검색 — 화양연화, 기생충, Drive My Car…"
        aria-label="영화 제목 검색"
        className="field pl-12 pr-28 py-4 text-base"
      />

      <button type="submit" className="btn btn-primary absolute right-1.5 py-2.5">
        검색
      </button>
    </form>
  );
}
