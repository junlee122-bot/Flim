// 5점 만점 별점 — SVG 클립으로 정확한 반점/소수점 표현
export default function StarRating({
  value,
  size = 14,
  showNumber = true,
}: {
  value: number | null;
  size?: number;
  showNumber?: boolean;
}) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;

  return (
    <span className="inline-flex items-center gap-1.5" title={`${value} / 5`}>
      <span
        className="relative inline-block leading-none"
        style={{ fontSize: size }}
        aria-hidden
      >
        {/* 빈 별 (바닥) */}
        <span className="text-bone/20">★★★★★</span>
        {/* 채워진 별 (clip 으로 비율만큼) */}
        <span
          className="absolute inset-0 overflow-hidden whitespace-nowrap text-accent"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </span>
      {showNumber && (
        <span className="text-xs tabular-nums text-muted">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
