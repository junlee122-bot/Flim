"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, setAdminCookie, clearAdminCookie } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureMovieRow } from "@/lib/data";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("관리자 인증이 필요합니다.");
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Supabase 가 설정되지 않았습니다.");
  return admin;
}

// ---- 인증 ----
export async function login(formData: FormData) {
  const secret = String(formData.get("secret") ?? "");
  await setAdminCookie(secret);
  revalidatePath("/admin");
}

export async function logout() {
  await clearAdminCookie();
  revalidatePath("/admin");
}

// ---- 오늘의 추천 영화 ----
export async function setDailyPick(formData: FormData) {
  const admin = await requireAdmin();
  const tmdbId = Number(formData.get("tmdbId"));
  const reason = String(formData.get("reason") ?? "");
  const date =
    String(formData.get("date") ?? "") ||
    new Date().toISOString().slice(0, 10);
  const row = await ensureMovieRow(tmdbId);
  if (!row) throw new Error("영화를 찾을 수 없습니다.");
  await admin
    .from("daily_picks")
    .upsert({ movie_id: row.id, pick_date: date, reason }, { onConflict: "pick_date" });
  revalidatePath("/");
}

// ---- 수상 정보 ----
export async function addAward(formData: FormData) {
  const admin = await requireAdmin();
  const tmdbId = Number(formData.get("tmdbId"));
  const row = await ensureMovieRow(tmdbId);
  if (!row) throw new Error("영화를 찾을 수 없습니다.");
  await admin.from("awards").insert({
    movie_id: row.id,
    festival: String(formData.get("festival") ?? ""),
    category: String(formData.get("category") ?? "") || null,
    year: Number(formData.get("year")) || null,
    result: String(formData.get("result") ?? "won"),
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath(`/movies/${tmdbId}`);
}

export async function deleteAward(formData: FormData) {
  const admin = await requireAdmin();
  await admin.from("awards").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin");
}

// ---- 큐레이션 ----
export async function createCuration(formData: FormData) {
  const admin = await requireAdmin();
  await admin.from("curations").insert({
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    sort_order: Number(formData.get("sort_order")) || 0,
  });
  revalidatePath("/");
}

export async function addMovieToCuration(formData: FormData) {
  const admin = await requireAdmin();
  const tmdbId = Number(formData.get("tmdbId"));
  const curationId = String(formData.get("curationId"));
  const row = await ensureMovieRow(tmdbId);
  if (!row) throw new Error("영화를 찾을 수 없습니다.");
  await admin.from("curation_movies").upsert({
    curation_id: curationId,
    movie_id: row.id,
    position: Number(formData.get("position")) || 0,
    note: String(formData.get("note") ?? "") || null,
  });
  revalidatePath("/");
}

// ---- 평론가 코멘트 (수동 등록) ----
export async function addManualReview(formData: FormData) {
  const admin = await requireAdmin();
  const tmdbId = Number(formData.get("tmdbId"));
  const row = await ensureMovieRow(tmdbId);
  if (!row) throw new Error("영화를 찾을 수 없습니다.");
  await admin.from("critic_reviews").insert({
    movie_id: row.id,
    critic_name: String(formData.get("critic_name") ?? ""),
    source_name: String(formData.get("source_name") ?? "") || null,
    source_url: String(formData.get("source_url") ?? "") || null,
    rating: formData.get("rating") ? Number(formData.get("rating")) : null,
    short_quote: String(formData.get("short_quote") ?? "") || null,
    summary: String(formData.get("summary") ?? "") || null,
    status: "approved", // 수동 등록은 바로 승인
    origin: "manual",
    confidence_score: 1,
  });
  revalidatePath(`/movies/${tmdbId}`);
}

// ---- 검토 워크플로우 ----
export async function approveReview(formData: FormData) {
  const admin = await requireAdmin();
  await admin
    .from("critic_reviews")
    .update({ status: "approved" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/reviews");
}

export async function rejectReview(formData: FormData) {
  const admin = await requireAdmin();
  await admin
    .from("critic_reviews")
    .update({ status: "rejected" })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/reviews");
}

export async function deleteReview(formData: FormData) {
  const admin = await requireAdmin();
  await admin
    .from("critic_reviews")
    .delete()
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/reviews");
}
