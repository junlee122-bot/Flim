import { createClient } from "@supabase/supabase-js";

// service_role 클라이언트 — RLS 우회. 서버 전용(관리자 작업/자동수집 저장).
// 절대 클라이언트 번들에 import 하지 말 것.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
