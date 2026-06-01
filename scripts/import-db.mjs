// DB 가져오기 — backup/*.json → 새 Supabase 프로젝트
// 실행: node scripts/import-db.mjs
// 필요: scripts/.seed-env 에 새 프로젝트의 SUPABASE_URL, SUPABASE_SERVICE_KEY 설정

import { readFileSync, existsSync } from "node:fs";
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

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

// generated always 컬럼은 INSERT 불가 — 제외 필요
const GENERATED_COLS = {
  movies: ["weighted_rating"],
  series: ["weighted_rating"],
};

// FK 의존 순서 (의존 없는 것 먼저)
const IMPORT_ORDER = [
  "movies",
  "series",
  "critics",
  "curations",
  "awards",
  "critic_reviews",
  "curation_movies",
  "daily_picks",
  // user_movies는 auth.users FK가 있어 스킵 (어차피 0행)
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upsertBatch(table, rows) {
  const exclude = GENERATED_COLS[table] || [];
  const clean = rows.map((r) => {
    const obj = { ...r };
    for (const col of exclude) delete obj[col];
    return obj;
  });

  const url = `${SB_URL}/rest/v1/${table}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(clean),
    });
    if (res.ok || res.status === 201) return;
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * Math.pow(2, attempt);
      console.log(`    재시도 대기 ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${table} upsert 실패: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  throw new Error(`${table}: 재시도 초과`);
}

async function importTable(table) {
  const path = join(BACKUP_DIR, `${table}.json`);
  if (!existsSync(path)) {
    console.log(`  ⚠️  backup/${table}.json 없음 — 건너뜀`);
    return 0;
  }
  const rows = JSON.parse(readFileSync(path, "utf8"));
  if (rows.length === 0) {
    console.log(`  ✅ ${table}: 0행 (비어있음)`);
    return 0;
  }

  const BATCH = 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await upsertBatch(table, chunk);
    done += chunk.length;
    process.stdout.write(`\r  📥 ${table}: ${done}/${rows.length}행`);
  }
  console.log(`\r  ✅ ${table}: ${rows.length}행 완료          `);
  return rows.length;
}

async function main() {
  console.log("📥 Flim DB 가져오기 시작");
  console.log(`   대상: ${SB_URL}\n`);

  // 스키마 적용 확인
  console.log("⚠️  시작 전 확인:");
  console.log("   새 프로젝트 SQL Editor에서 다음 파일을 순서대로 실행했나요?");
  console.log("   1. supabase/schema.sql");
  console.log("   2. supabase/series.sql");
  console.log("   3. supabase/auth_sync.sql");
  console.log("   (이미 완료했다면 계속 진행합니다...)\n");
  await sleep(3000);

  let total = 0;
  for (const table of IMPORT_ORDER) {
    try {
      total += await importTable(table);
    } catch (e) {
      console.error(`\n❌ ${table} 실패: ${e.message}`);
      process.exit(1);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 가져오기 완료: 총 ${total}행`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n다음 단계:");
  console.log("1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables");
  console.log("   NEXT_PUBLIC_SUPABASE_URL  → 새 프로젝트 URL");
  console.log("   NEXT_PUBLIC_SUPABASE_ANON_KEY → 새 프로젝트 anon key");
  console.log("   SUPABASE_SERVICE_KEY → 새 프로젝트 service role key");
  console.log("2. Vercel Redeploy");
  console.log("3. 사이트 동작 확인 후 구 프로젝트 삭제 또는 일시정지");
}

main().catch((e) => { console.error(e); process.exit(1); });
