// 영화제별 상징 아이콘(골드 SVG). 실제 트로피 사진 대신 저작권 안전한 심볼.
//   오스카=트로피, 칸=황금종려잎, 베니스=황금사자, 베를린=황금곰, 기타=월계관

function festivalKey(
  name: string,
): "oscar" | "cannes" | "venice" | "berlin" | "globe" | "bafta" | "generic" {
  const n = name.toLowerCase();
  if (n.includes("bafta") || n.includes("영국 아카데미")) return "bafta";
  if (n.includes("골든") || n.includes("globe")) return "globe";
  if (n.includes("아카데미") || n.includes("oscar") || n.includes("academy")) return "oscar";
  if (n.includes("칸") || n.includes("cannes")) return "cannes";
  if (n.includes("베니스") || n.includes("venice")) return "venice";
  if (n.includes("베를린") || n.includes("berlin")) return "berlin";
  return "generic";
}

export const FESTIVAL_LABEL: Record<string, string> = {
  oscar: "Academy Awards",
  cannes: "Cannes",
  venice: "Venezia",
  berlin: "Berlinale",
  globe: "Golden Globes",
  bafta: "BAFTA",
  generic: "Award",
};

export function festivalKeyOf(name: string) {
  return festivalKey(name);
}

export default function AwardBadge({
  festival,
  size = 44,
}: {
  festival: string;
  size?: number;
}) {
  const k = festivalKey(festival);
  const gold = "#d8bd78";
  const deep = "#a07f2f";
  const s = { width: size, height: size };

  if (k === "oscar")
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <rect x="14" y="40" width="20" height="5" rx="1" fill={deep} />
        <rect x="18" y="36" width="12" height="5" fill={gold} />
        <path d="M24 6c-3 0-5 2.4-5 6 0 4 2 7 2 10v4h6v-4c0-3 2-6 2-10 0-3.6-2-6-5-6z" fill={gold} />
        <circle cx="24" cy="9.5" r="2.4" fill="#f0e2bd" />
        <rect x="20" y="26" width="8" height="3" fill={deep} />
      </svg>
    );

  if (k === "cannes")
    // 황금종려잎(Palme d'Or)
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <path d="M24 44V20" stroke={deep} strokeWidth="2.5" strokeLinecap="round" />
        <g fill={gold}>
          <path d="M24 20c-6-2-10-7-11-13 5 1 9 4 11 9z" />
          <path d="M24 20c6-2 10-7 11-13-5 1-9 4-11 9z" />
          <path d="M24 26c-5-2-8-6-9-11 4 1 7 3 9 7z" />
          <path d="M24 26c5-2 8-6 9-11-4 1-7 3-9 7z" />
          <path d="M24 13c-1.5-3-1.5-6 0-9 1.5 3 1.5 6 0 9z" />
        </g>
      </svg>
    );

  if (k === "venice")
    // 황금사자(Leone d'Oro) — 사자 머리 실루엣
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <circle cx="24" cy="24" r="16" fill="none" stroke={gold} strokeWidth="2" />
        <g fill={gold}>
          <circle cx="24" cy="23" r="7" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={24 + Math.cos(a) * 11} cy={23 + Math.sin(a) * 11} r="2.4" />;
          })}
        </g>
        <circle cx="21.5" cy="22" r="1.1" fill={deep} />
        <circle cx="26.5" cy="22" r="1.1" fill={deep} />
      </svg>
    );

  if (k === "berlin")
    // 황금곰(Goldener Bär)
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <g fill={gold}>
          <circle cx="24" cy="22" r="11" />
          <circle cx="16" cy="11" r="4" />
          <circle cx="32" cy="11" r="4" />
        </g>
        <circle cx="20" cy="20" r="1.4" fill={deep} />
        <circle cx="28" cy="20" r="1.4" fill={deep} />
        <circle cx="24" cy="25" r="2" fill={deep} />
      </svg>
    );

  if (k === "globe")
    // 골든 글로브 — 받침대 위 지구본
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <rect x="14" y="40" width="20" height="5" rx="1" fill={deep} />
        <rect x="20" y="36" width="8" height="5" fill={gold} />
        <circle cx="24" cy="20" r="13" fill={gold} />
        <g fill="none" stroke={deep} strokeWidth="1.4">
          <ellipse cx="24" cy="20" rx="5.5" ry="13" />
          <line x1="11" y1="20" x2="37" y2="20" />
          <path d="M13 13h22M13 27h22" />
        </g>
      </svg>
    );

  if (k === "bafta")
    // BAFTA — 가면(mask)
    return (
      <svg viewBox="0 0 48 48" style={s} aria-hidden>
        <rect x="16" y="40" width="16" height="5" rx="1" fill={deep} />
        <path d="M24 8c-8 0-13 5-13 14 0 7 6 12 13 12s13-5 13-12c0-9-5-14-13-14z" fill={gold} />
        <ellipse cx="18.5" cy="22" rx="3" ry="2.2" fill={deep} />
        <ellipse cx="29.5" cy="22" rx="3" ry="2.2" fill={deep} />
        <path d="M20 29q4 3 8 0" stroke={deep} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );

  // 월계관 (generic)
  return (
    <svg viewBox="0 0 48 48" style={s} aria-hidden>
      <g fill="none" stroke={gold} strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 42c-7-2-12-9-12-18" />
        <path d="M24 42c7-2 12-9 12-18" />
      </g>
      <g fill={gold}>
        {[14, 20, 26, 30].map((y, i) => (
          <ellipse key={i} cx={13 + i * 0.5} cy={y} rx="3" ry="1.6" transform={`rotate(-40 ${13} ${y})`} />
        ))}
        {[14, 20, 26, 30].map((y, i) => (
          <ellipse key={"r" + i} cx={35 - i * 0.5} cy={y} rx="3" ry="1.6" transform={`rotate(40 ${35} ${y})`} />
        ))}
      </g>
    </svg>
  );
}
