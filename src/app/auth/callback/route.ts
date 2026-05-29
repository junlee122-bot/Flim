import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// 매직링크/OAuth 콜백 — code 를 세션으로 교환하고 홈으로 돌려보낸다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/my";

  if (code) {
    const sb = await getSupabaseServer();
    if (sb) await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
