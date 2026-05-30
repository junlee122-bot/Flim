import type { WatchProviders } from "@/types";

// OTT 시청 정보 — 구독/대여/구매로 묶어 로고와 함께 표시.
// JustWatch 링크가 있으면 전체를 그쪽으로 연결(딥링크는 TMDb 가 제공 안 함).
export default function WatchHere({ data }: { data: WatchProviders }) {
  const groups: { label: string; items: WatchProviders["flatrate"] }[] = [
    { label: "구독", items: data.flatrate },
    { label: "대여", items: data.rent },
    { label: "구매", items: data.buy },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted">
        현재 국내 스트리밍 정보가 없습니다. (제공: JustWatch)
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-wrap items-center gap-3">
          <span className="w-10 shrink-0 text-xs uppercase tracking-wider text-faint">
            {g.label}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {g.items.map((p) => {
              const chip = (
                <span className="flex items-center gap-2 rounded-md border border-bone/15 bg-ink-900 py-1.5 pl-1.5 pr-3 text-sm transition hover:border-accent/40">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt=""
                      className="h-7 w-7 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="text-bone">{p.name}</span>
                </span>
              );
              return data.link ? (
                <a
                  key={p.name}
                  href={data.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${p.name} · JustWatch 에서 보기`}
                >
                  {chip}
                </a>
              ) : (
                <span key={p.name}>{chip}</span>
              );
            })}
          </div>
        </div>
      ))}
      {data.link && (
        <a
          href={data.link}
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline inline-block text-xs text-accent"
        >
          JustWatch 에서 자세히 →
        </a>
      )}
      <p className="text-xs text-faint">제공: JustWatch · 국내(KR) 기준</p>
    </div>
  );
}
