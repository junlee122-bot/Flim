import { ImageResponse } from "next/og";

export const runtime = "edge";

// 동적 OG 이미지 — /pick 공유 시 취향 카드 형태로 렌더.
// 쿼리: mood(라벨), genres(쉼표), titles(추천작 제목 쉼표), n(편수)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mood = searchParams.get("mood") || "";
  const genres = (searchParams.get("genres") || "").split(",").filter(Boolean).slice(0, 4);
  const titles = (searchParams.get("titles") || "").split("|").filter(Boolean).slice(0, 3);

  const chips = [mood, ...genres].filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b0b0d 0%, #15151a 100%)",
          padding: "64px 72px",
          fontFamily: "serif",
        }}
      >
        {/* 상단: 브랜드 + kicker */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "40px", color: "#ece7dc", letterSpacing: "-1px" }}>
              FLIM
            </span>
            <span style={{ fontSize: "40px", color: "#c9a24a" }}>.</span>
          </div>
          <span
            style={{
              fontSize: "20px",
              letterSpacing: "6px",
              color: "#c9a24a",
              textTransform: "uppercase",
            }}
          >
            Today&apos;s Picks
          </span>
        </div>

        {/* 중앙: 헤드라인 + 칩 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <span style={{ fontSize: "72px", color: "#ece7dc", lineHeight: 1.1 }}>
            오늘, 뭐 볼까?
          </span>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {chips.map((c, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  fontSize: "26px",
                  color: "#d8bd78",
                  border: "1px solid rgba(201,162,74,0.5)",
                  borderRadius: "999px",
                  padding: "8px 22px",
                  background: "rgba(201,162,74,0.08)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* 하단: 추천작 제목 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {titles.length > 0 ? (
            titles.map((t, i) => (
              <span key={i} style={{ fontSize: "30px", color: "#928d83", display: "flex" }}>
                <span style={{ color: "#c9a24a", marginRight: "14px" }}>{i + 1}</span>
                {t}
              </span>
            ))
          ) : (
            <span style={{ fontSize: "26px", color: "#5f5b54" }}>
              씨네필을 위한 영화 큐레이션 아카이브
            </span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
