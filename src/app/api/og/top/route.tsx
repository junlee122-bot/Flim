import { ImageResponse } from "next/og";

export const runtime = "edge";

// 내 인생영화 TOP N OG 이미지. 쿼리: t=제목1|제목2|... (최대 10)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const titles = (searchParams.get("t") || "").split("|").filter(Boolean).slice(0, 10);
  const col1 = titles.slice(0, 5);
  const col2 = titles.slice(5, 10);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b0b0d 0%, #15151a 100%)",
          padding: "56px 64px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "34px", color: "#ece7dc" }}>FLIM</span>
          <span style={{ fontSize: "34px", color: "#c9a24a" }}>.</span>
          <span style={{ fontSize: "18px", letterSpacing: "5px", color: "#c9a24a", textTransform: "uppercase", marginLeft: "8px" }}>
            My Top Films
          </span>
        </div>
        <span style={{ fontSize: "54px", color: "#ece7dc", margin: "10px 0 26px" }}>
          내 인생 영화
        </span>
        <div style={{ display: "flex", gap: "48px" }}>
          {[col1, col2].map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {col.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "26px", color: "#d8d2c6" }}>
                  <span style={{ color: "#c9a24a", width: "30px" }}>{ci * 5 + i + 1}</span>
                  <span>{t.length > 22 ? t.slice(0, 22) + "…" : t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
