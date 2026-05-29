import { createBrowserClient } from "@supabase/ssr";

// 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
// 환경변수가 없으면 null → 로그인 기능 비활성(로컬 저장만 동작).
let cached: ReturnType<typeof createBrowserClient> | null = null;
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!cached) cached = createBrowserClient(url, key);
  return cached;
}
