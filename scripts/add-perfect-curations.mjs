/* eslint-disable @typescript-eslint/no-explicit-any */
// 만점/최고점 위주 큐레이션 생성.
//   1) "거장의 만점작" — 가중평점 최상위(투표 1000+) 영화
//   2) "이동진 만점작" — critic_reviews 에서 이동진 별점 5.0
//   3) "평론가 만점작" — 어떤 평론가든 5.0 받은 영화
// 실행: node scripts/add-perfect-curations.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SB_KEY) { console.error("env 누락"); process.exit(1); }
const sb = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const g = async (path) => (await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sb })).json();

async function createCuration(meta, movieIds) {
  const ids = [...new Set(movieIds)].slice(0, 24);
  if (ids.length < 3) { console.log(`✗ ${meta.title} (${ids.length}편)`); return; }
  const r = await fetch(`${SB_URL}/rest/v1/curations?on_conflict=slug`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(meta) });
  const [cur] = await r.json();
  // 기존 연결 비우고 새로
  await fetch(`${SB_URL}/rest/v1/curation_movies?curation_id=eq.${cur.id}`, { method: "DELETE", headers: sb });
  let pos = 1;
  const rows = ids.map((mid) => ({ curation_id: cur.id, movie_id: mid, position: pos++ }));
  await fetch(`${SB_URL}/rest/v1/curation_movies?on_conflict=curation_id,movie_id`, {
    method: "POST", headers: { ...sb, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(rows) });
  console.log(`✓ ${meta.title} (${ids.length}편)`);
}

async function main() {
  let max = (await g("curations?select=sort_order")).reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);

  // 1) 거장의 만점작 — 가중평점 최상위
  const top = await g("movies?select=id&vote_count=gte.1000&order=weighted_rating.desc&limit=24");
  await createCuration(
    { slug: "near-perfect", title: "★ 거장의 만점작", description: "가중 평점 최상위. 시대를 넘어 검증된, 별점에 가장 가까운 걸작들.", sort_order: ++max, cover_image: null },
    top.map((m) => m.id),
  );

  // 2) 이동진 만점작 (5.0)
  const ldj = await g("critic_reviews?select=movie_id&critic_name=eq.%EC%9D%B4%EB%8F%99%EC%A7%84&rating=eq.5&status=eq.approved");
  await createCuration(
    { slug: "lee-dong-jin-perfect", title: "이동진 ★5 만점작", description: "이동진 평론가가 만점(별 다섯)을 준 영화들.", sort_order: ++max, cover_image: null },
    ldj.map((r) => r.movie_id),
  );

  // 3) 평론가 만점작 (누구든 5.0)
  const any5 = await g("critic_reviews?select=movie_id&rating=eq.5&status=eq.approved");
  await createCuration(
    { slug: "critics-perfect", title: "평론가 만점작", description: "주요 평론가들이 만점을 헌정한 작품. 별 다섯의 영예.", sort_order: ++max, cover_image: null },
    any5.map((r) => r.movie_id),
  );

  console.log("\n완료.");
}
main().catch((e) => { console.error(e); process.exit(1); });
