import { cookies } from "next/headers";

// MVP 관리자 인증: ADMIN_SECRET 과 일치하는 쿠키를 검사.
// (운영 시 Supabase Auth + role 로 교체 권장)
const COOKIE = "flim_admin";

export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const store = await cookies();
  return store.get(COOKIE)?.value === secret;
}

export async function setAdminCookie(value: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || value !== secret) return false;
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return true;
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
