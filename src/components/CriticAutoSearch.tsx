"use client";

import { useState } from "react";
import { DEFAULT_CRITICS } from "@/lib/critics";
import type { ReviewCandidate } from "@/types";
import StarRating from "./StarRating";

export default function CriticAutoSearch({
  tmdbId,
  title,
}: {
  tmdbId: number;
  title: string;
}) {
  const [critic, setCritic] = useState<string>(DEFAULT_CRITICS[0].name);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ReviewCandidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setError(null);
    setSaved(null);
    setCandidates([]);
    setSelected(new Set());
    setOpen(true);
    try {
      const res = await fetch("/api/critic-reviews/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, criticName: critic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "검색에 실패했습니다.");
        return;
      }
      setCandidates(data.candidates ?? []);
      setSelected(
        new Set((data.candidates ?? []).map((_: unknown, i: number) => i)),
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function saveSelected() {
    const chosen = candidates.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/critic-reviews/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, candidates: chosen }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved(
        `${data.inserted ?? chosen.length}건을 '검토 대기'로 저장했습니다. 관리자 승인 후 공개됩니다.`,
      );
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-bone/10 bg-ink-900/60 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="critic-select" className="text-sm text-muted">
            평론가
          </label>
          <select
            id="critic-select"
            value={critic}
            onChange={(e) => setCritic(e.target.value)}
            className="rounded-md border border-bone/15 bg-ink-800 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          >
            {DEFAULT_CRITICS.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={runSearch}
          disabled={loading}
          className="btn btn-accent py-2.5"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          평론가 평 자동 검색
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-faint">
        “{critic} {title}” 로 검색합니다. 짧은 한줄평·요약·원문 링크만 수집되며,
        검토 대기 상태로 저장됩니다. (저작권 준수 — 전문 미수집)
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[82vh] w-full max-w-2xl animate-scale-in overflow-y-auto rounded-lg border border-bone/15 bg-ink-900 p-6 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-bone/10 pb-4">
              <div>
                <p className="kicker">Auto Search</p>
                <h3 className="headline mt-1.5 text-xl">검색 결과 미리보기</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted transition hover:bg-ink-800 hover:text-bone"
                aria-label="닫기"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-3 py-8 text-sm text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-bone/20 border-t-accent" />
                검색 중…
              </div>
            )}
            {error && (
              <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            {saved && (
              <p className="mt-4 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
                {saved}
              </p>
            )}

            {!loading && !error && candidates.length === 0 && !saved && (
              <p className="py-8 text-center text-sm text-muted">
                후보를 찾지 못했습니다.
              </p>
            )}

            {candidates.length > 0 && (
              <>
                <ul className="mt-4 space-y-3">
                  {candidates.map((c, i) => {
                    const checked = selected.has(i);
                    return (
                      <li key={c.sourceUrl}>
                        <label
                          className={`flex cursor-pointer gap-3 rounded-md border p-3 transition ${
                            checked
                              ? "border-accent/40 bg-accent/[0.06]"
                              : "border-bone/10 hover:border-bone/25"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(i)}
                            className="mt-1 accent-[#c9a24a]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-muted">{c.sourceName}</span>
                              <StarRating value={c.rating} />
                              <span className="ml-auto rounded-full bg-ink-800 px-2 py-0.5 text-xs text-muted">
                                신뢰도 {(c.confidenceScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            {c.shortQuote && (
                              <p className="mt-1.5 text-sm text-bone">
                                “{c.shortQuote}”
                              </p>
                            )}
                            {c.summary && (
                              <p className="mt-1 text-xs leading-relaxed text-muted">
                                {c.summary}
                              </p>
                            )}
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1.5 inline-block break-all text-xs text-accent hover:underline"
                            >
                              {c.sourceUrl}
                            </a>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-bone/10 pt-4">
                  <p className="text-xs text-faint">
                    저장은 관리자 권한이 필요합니다.
                  </p>
                  <button
                    onClick={saveSelected}
                    disabled={loading || selected.size === 0}
                    className="btn btn-primary py-2.5"
                  >
                    선택 {selected.size}건 검토 대기로 저장
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
