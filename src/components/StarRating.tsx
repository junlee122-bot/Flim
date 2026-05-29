// 5점 만점 별점 표시 (반점 지원)
export default function StarRating({ value }: { value: number | null }) {
  if (value == null) return null;
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-accent" title={`${value} / 5`}>
      {"★".repeat(full)}
      {half ? "⯨" : ""}
      <span className="text-bone/20">{"★".repeat(Math.max(0, empty))}</span>
      <span className="ml-1 text-xs text-muted">{value.toFixed(1)}</span>
    </span>
  );
}
