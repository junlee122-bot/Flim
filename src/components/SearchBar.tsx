"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Suggestion = { type: string; id: number; title: string; sub: string; img: string | null };
const RECENT_KEY = "flim_recent_q";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const cur = getRecent().filter((x) => x !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...cur].slice(0, 8)));
}

export default function SearchBar({
  initial = "",
  autoFocus = false,
}: {
  initial?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setRecent(getRecent()), []);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // 디바운스 자동완성
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setSugs([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setSugs(data.results ?? []);
      } catch {
        setSugs([]);
      }
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function submit(query: string) {
    const term = query.trim();
    if (!term) return;
    pushRecent(term);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function go(s: Suggestion) {
    setOpen(false);
    if (s.type === "person") router.push(`/people/${s.id}`);
    else if (s.type === "tv") router.push(`/series/${s.id}`);
    else router.push(`/movies/${s.id}`);
  }

  // 드롭다운에 보일 항목들 (입력 있으면 자동완성, 없으면 최근 검색어)
  const showRecent = !q.trim() && recent.length > 0;
  const items = q.trim() ? sugs : [];

  function onKeyDown(e: React.KeyboardEvent) {
    const len = items.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, len - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      if (active >= 0 && items[active]) {
        e.preventDefault();
        go(items[active]);
      } else {
        submit(q);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="group relative flex w-full items-center"
        role="search"
      >
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
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="영화 · 시리즈 · 인물 검색"
          aria-label="검색"
          aria-autocomplete="list"
          aria-expanded={open}
          className="field pl-12 pr-28 py-4 text-base"
        />
        <button type="submit" className="btn btn-primary absolute right-1.5 py-2.5">
          검색
        </button>
      </form>

      {/* 드롭다운 */}
      {open && (items.length > 0 || showRecent) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-bone/15 bg-ink-900 shadow-2xl shadow-black/50">
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs uppercase tracking-wider text-faint">최근 검색</span>
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecent([]);
                  }}
                  className="text-xs text-faint hover:text-bone"
                >
                  지우기
                </button>
              </div>
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => submit(r)}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-muted hover:bg-ink-800 hover:text-bone"
                >
                  <svg className="h-4 w-4 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" />
                  </svg>
                  {r}
                </button>
              ))}
            </div>
          )}

          {items.map((s, i) => (
            <button
              key={`${s.type}-${s.id}`}
              onClick={() => go(s)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                i === active ? "bg-ink-800" : "hover:bg-ink-800"
              }`}
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-ink-700">
                {s.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.img} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-bone">{s.title}</p>
                <p className="truncate text-xs text-muted">{s.sub}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
