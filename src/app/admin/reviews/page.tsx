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
        관리자 인증이 필요합니다. <Link href="/admin" className="text-accent">로그인 →</Link>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-bone/10 pb-4">
        <div>
          <p className="kicker">MODERATION</p>
          <h1 className="headline mt-1 text-3xl">평론 검토 대기</h1>
        </div>
        <Link href="/admin" className="text-sm text-muted hover:text-bone">
          ← 관리자
        </Link>
      </div>

      <p className="text-sm text-muted">
        자동 수집된 평론 후보입니다. 출처·내용을 확인 후 승인하면 영화 상세
        페이지에 공개됩니다.
      </p>

      {pending.length === 0 ? (
        <p className="text-muted">검토 대기 중인 평론이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li
              key={r.id}
              className="rounded-sm border border-bone/10 bg-ink-900 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{r.critic_name}</span>
                {r.source_name && (
                  <span className="text-muted">· {r.source_name}</span>
                )}
                <StarRating value={r.rating} />
                <span className="ml-auto text-xs text-muted">
                  신뢰도 {(r.confidence_score * 100).toFixed(0)}% · {r.origin}
                </span>
              </div>
              {r.short_quote && <p className="mt-2">“{r.short_quote}”</p>}
              {r.summary && (
                <p className="mt-1 text-sm text-muted">{r.summary}</p>
              )}
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all text-xs text-accent hover:underline"
                >
                  {r.source_url}
                </a>
              )}
              <div className="mt-3 flex gap-2">
                <form action={approveReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-sm bg-green-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600">
                    승인
                  </button>
                </form>
                <form action={rejectReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-sm border border-bone/20 px-3 py-1.5 text-xs hover:bg-ink-700">
                    거절
                  </button>
                </form>
                <form action={deleteReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded-sm px-3 py-1.5 text-xs text-red-400 hover:text-red-300">
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
