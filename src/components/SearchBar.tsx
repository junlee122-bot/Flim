"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex w-full items-center gap-2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="영화 제목으로 검색 — 예: 화양연화, 기생충, Drive My Car"
        className="w-full rounded-sm border border-bone/15 bg-ink-900 px-4 py-3 text-bone placeholder:text-muted/60 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-sm bg-bone px-5 py-3 text-sm font-medium text-ink-950 hover:bg-accent"
      >
        검색
      </button>
    </form>
  );
}
