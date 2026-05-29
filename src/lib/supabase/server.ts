import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트/route 에서 쓰는 anon 클라이언트 (RLS 적용 = 공개 데이터만 읽음).
// 환경변수가 없으면 null 을 반환해 MVP 가 키 없이도 빌드/렌더되게 한다.
export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (
        toSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서의 set 은 무시 (read-only 컨텍스트)
        }
      },
    },
  });
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
