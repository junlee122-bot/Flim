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
      setSelected(new Set((data.candidates ?? []).map((_: unknown, i: number) => i)));
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
    <div className="rounded-sm border border-bone/15 bg-ink-900 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">평론가</span>
        <select
          value={critic}
          onChange={(e) => setCritic(e.target.value)}
          className="rounded-sm border border-bone/15 bg-ink-800 px-3 py-2 text-sm"
        >
          {DEFAULT_CRITICS.map((c) => (
            <option key={c.slug} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={runSearch}
          disabled={loading}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90 disabled:opacity-50"
        >
          평론가 평 자동 검색
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        “{critic} {title}” 로 검색합니다. 결과는 짧은 한줄평·요약·원문 링크만
        수집되며, 검토 대기 상태로 저장됩니다.
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-bone/15 bg-ink-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="headline text-xl">검색 결과 미리보기</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-bone"
              >
                ✕
              </button>
            </div>

            {loading && <p className="mt-4 text-sm text-muted">검색 중…</p>}
            {error && (
              <p className="mt-4 rounded-sm border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            {saved && (
              <p className="mt-4 rounded-sm border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
                {saved}
              </p>
            )}

            {!loading && !error && candidates.length === 0 && !saved && (
              <p className="mt-4 text-sm text-muted">
                후보를 찾지 못했습니다.
              </p>
            )}

            {candidates.length > 0 && (
              <>
                <ul className="mt-4 space-y-3">
                  {candidates.map((c, i) => (
                    <li
                      key={c.sourceUrl}
                      className="flex gap-3 rounded-sm border border-bone/10 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggle(i)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted">{c.sourceName}</span>
                          <StarRating value={c.rating} />
                          <span className="ml-auto text-xs text-muted">
                            신뢰도 {(c.confidenceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        {c.shortQuote && (
                          <p className="mt-1 text-sm">“{c.shortQuote}”</p>
                        )}
                        {c.summary && (
                          <p className="mt-1 text-xs text-muted">{c.summary}</p>
                        )}
                        <a
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block break-all text-xs text-accent hover:underline"
                        >
                          {c.sourceUrl}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={saveSelected}
                    disabled={loading || selected.size === 0}
                    className="rounded-sm bg-bone px-4 py-2 text-sm font-medium text-ink-950 hover:bg-accent disabled:opacity-50"
                  >
                    선택 {selected.size}건 검토 대기로 저장
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  저장은 관리자 권한이 필요합니다. (관리자 로그인 후 이용)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
