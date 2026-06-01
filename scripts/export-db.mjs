// DB 전체 내보내기 — 현재 Supabase 프로젝트 → backup/*.json
// 실행: node scripts/export-db.mjs
// 필요: SUPABASE_URL, SUPABASE_SERVICE_KEY (service role key)

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_URL || !SB_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_SERVICE_KEY 가 필요합니다.");
  process.exit(1);
}

const BACKUP_DIR = join(__dir, "..", "backup");
mkdirSync(BACKUP_DIR, { recursive: true });

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

// 테이블 내보내기 순서 (FK 순서와 무관하게 모두 추출)
const TABLES = [
  "movies",
  "series",
  "critics",
  "curations",
  "awards",
  "critic_reviews",
  "curation_movies",
  "daily_picks",
  "user_movies",
];

async function fetchAll(table) {
  const rows = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const url = `${SB_URL}/rest/v1/${table}?select=*&order=created_at&limit=${PAGE}&offset=${from}`;
    const res = await fetch(url, {
      headers: { ...headers, "Range-Unit": "items", Range: `${from}-${from + PAGE - 1}` },
    });
    if (!res.ok) {
      const text = await res.text();
      // 테이블이 없으면 건너뜀
      if (res.status === 404 || text.includes("does not exist")) {
        console.log(`  ⚠️  ${table} 테이블 없음 — 건너뜀`);
        return null;
      }
      throw new Error(`${table}: HTTP ${res.status} — ${text}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function main() {
  console.log("📦 Flim DB 내보내기 시작\n");
  const summary = {};

  for (const table of TABLES) {
    process.stdout.write(`  ${table} ... `);
    try {
      const rows = await fetchAll(table);
      if (rows === null) {
        summary[table] = 0;
        continue;
      }
      const path = join(BACKUP_DIR, `${table}.json`);
      writeFileSync(path, JSON.stringify(rows, null, 2));
      summary[table] = rows.length;
      console.log(`✅ ${rows.length}행 → backup/${table}.json`);
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`);
      summary[table] = -1;
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("내보내기 완료");
  for (const [t, n] of Object.entries(summary)) {
    if (n > 0) console.log(`  ${t}: ${n}행`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n다음 단계:");
  console.log("1. Supabase에서 새 무료 프로젝트 생성");
  console.log("2. 새 프로젝트 SQL Editor에 schema.sql, series.sql, auth_sync.sql 순서로 실행");
  console.log("3. scripts/.seed-env 의 SUPABASE_URL / SUPABASE_SERVICE_KEY를 새 프로젝트 값으로 교체");
  console.log("4. node scripts/import-db.mjs 실행");
}

main().catch((e) => { console.error(e); process.exit(1); });
