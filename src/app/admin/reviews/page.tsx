import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import StarRating from "@/components/StarRating";
import { approveReview, rejectReview, deleteReview } from "../actions";
import type { CriticReview } from "@/types";

export const dynamic = "force-dynamic";

export default async function ReviewModerationPage() {
  if (!(await isAdmin())) {
    return (
      <p className="text-sm text-muted">
        관리자 인증이 필요합니다.{" "}
        <Link href="/admin" className="text-accent link-underline">
          로그인 →
        </Link>
      </p>
    );
  }
  const admin = getSupabaseAdmin();
  const pending = admin
    ? ((
        await admin
          .from("critic_reviews")
          .select("*")
          .eq("status", "pending")
          .order("confidence_score", { ascending: false })
      ).data as CriticReview[] | null) ?? []
    : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/10 pb-5">
        <div>
          <p className="kicker">Moderation</p>
          <h1 className="headline mt-2 text-3xl">평론 검토 대기</h1>
        </div>
        <Link href="/admin" className="link-underline text-sm text-muted">
          ← 관리자
        </Link>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        자동 수집된 평론 후보입니다. 출처·내용을 확인 후 승인하면 영화 상세
        페이지에 공개됩니다.
      </p>

      {pending.length === 0 ? (
        <div className="rounded-md border border-dashed border-bone/15 bg-ink-900/40 p-12 text-center">
          <p className="headline text-xl text-muted">
            검토 대기 중인 평론이 없습니다
          </p>
          <p className="mt-2 text-sm text-faint">
            영화 상세 페이지에서 “평론가 평 자동 검색”으로 후보를 수집할 수
            있습니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-bone">{r.critic_name}</span>
                {r.source_name && (
                  <span className="text-muted">· {r.source_name}</span>
                )}
                <StarRating value={r.rating} />
                <span className="ml-auto rounded-full bg-ink-800 px-2 py-0.5 text-xs text-muted">
                  신뢰도 {(r.confidence_score * 100).toFixed(0)}% · {r.origin}
                </span>
              </div>
              {r.short_quote && (
                <p className="mt-3 headline text-lg text-bone">
                  “{r.short_quote}”
                </p>
              )}
              {r.summary && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {r.summary}
                </p>
              )}
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block break-all text-xs text-accent hover:underline"
                >
                  {r.source_url}
                </a>
              )}
              <div className="mt-4 flex gap-2 border-t border-bone/10 pt-4">
                <form action={approveReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-md bg-green-600/80 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-600">
                    승인
                  </button>
                </form>
                <form action={rejectReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-md border border-bone/20 px-4 py-2 text-xs text-bone transition hover:bg-ink-700">
                    거절
                  </button>
                </form>
                <form action={deleteReview} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-md px-4 py-2 text-xs text-red-400 transition hover:text-red-300">
                    삭제
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
