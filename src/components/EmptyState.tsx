import Link from "next/link";

// 빈 상태 — 아이콘(이모지/심볼) + 제목 + 설명 + 선택적 액션 버튼.
export default function EmptyState({
  icon = "🎬",
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-bone/15 bg-ink-900/40 px-6 py-14 text-center">
      <span className="mb-4 text-3xl opacity-70" aria-hidden>
        {icon}
      </span>
      <p className="headline text-xl text-bone">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn btn-accent mt-6">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
