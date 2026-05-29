import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurations } from "@/lib/data";
import {
  login,
  logout,
  setDailyPick,
  addAward,
  createCuration,
  addMovieToCuration,
  addManualReview,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <Notice>
        Supabase 가 설정되지 않았습니다.{" "}
        <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">.env.local</code>{" "}
        에 Supabase URL/키를 추가하고{" "}
        <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
          supabase/schema.sql
        </code>{" "}
        을 실행하세요.
      </Notice>
    );
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-10">
        <div className="text-center">
          <p className="kicker">Admin</p>
          <h1 className="headline mt-3 text-3xl">관리자 로그인</h1>
        </div>
        <form action={login} className="space-y-3">
          <input
            name="secret"
            type="password"
            placeholder="ADMIN_SECRET"
            className="field"
          />
          <button className="btn btn-primary w-full" type="submit">
            로그인
          </button>
        </form>
        <p className="text-center text-xs leading-relaxed text-faint">
          MVP 인증입니다.{" "}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
            ADMIN_SECRET
          </code>{" "}
          환경변수 값과 일치해야 합니다.
        </p>
      </div>
    );
  }

  const curations = await getCurations();

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/10 pb-5">
        <div>
          <p className="kicker">Admin</p>
          <h1 className="headline mt-2 text-3xl">관리자</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/reviews" className="btn btn-ghost py-2">
            평론 검토 대기 →
          </Link>
          <form action={logout}>
            <button className="text-muted link-underline">로그아웃</button>
          </form>
        </div>
      </header>

      <p className="rounded-md border border-bone/10 bg-ink-900/40 p-4 text-sm leading-relaxed text-muted">
        모든 작업은 <span className="text-bone">TMDb ID</span> 기준입니다. 검색
        페이지에서 영화를 누르면 주소{" "}
        <code className="rounded bg-ink-800 px-1.5 py-0.5 text-xs">
          /movies/&lt;TMDb ID&gt;
        </code>{" "}
        에서 확인할 수 있습니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="오늘의 추천 영화 지정" kicker="Today's Pick">
          <form action={setDailyPick} className="space-y-3">
            <input name="tmdbId" placeholder="TMDb ID" className="field" required />
            <input name="date" type="date" className="field" />
            <input name="reason" placeholder="추천 이유 (선택)" className="field" />
            <button className="btn btn-accent">추천작 지정</button>
          </form>
        </Card>

        <Card title="수상 정보 추가" kicker="Awards">
          <form action={addAward} className="space-y-3">
            <input name="tmdbId" placeholder="TMDb ID" className="field" required />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="festival"
                placeholder="영화제 (예: 칸, 오스카)"
                className="field"
                required
              />
              <input
                name="category"
                placeholder="부문 (예: 황금종려상)"
                className="field"
              />
              <input name="year" placeholder="연도" className="field" />
              <select name="result" className="field">
                <option value="won">수상</option>
                <option value="nominated">후보</option>
              </select>
            </div>
            <input name="note" placeholder="비고 (선택)" className="field" />
            <button className="btn btn-accent">수상 정보 추가</button>
          </form>
        </Card>

        <Card
          title="평론가 코멘트 직접 등록"
          kicker="Critics · 즉시 공개"
          className="lg:col-span-2"
        >
          <form action={addManualReview} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="tmdbId"
                placeholder="TMDb ID"
                className="field"
                required
              />
              <input
                name="critic_name"
                placeholder="평론가명"
                className="field"
                required
              />
              <input
                name="source_name"
                placeholder="출처 (예: 씨네21)"
                className="field"
              />
              <input
                name="rating"
                placeholder="별점 (5점 만점)"
                className="field"
              />
            </div>
            <input name="source_url" placeholder="원문 링크" className="field" />
            <input
              name="short_quote"
              placeholder="한줄평 (짧은 인용)"
              className="field"
            />
            <textarea
              name="summary"
              placeholder="핵심 요약"
              className="field"
              rows={2}
            />
            <button className="btn btn-accent">코멘트 등록</button>
          </form>
        </Card>

        <Card title="큐레이션 리스트 생성" kicker="Curations">
          <form action={createCuration} className="space-y-3">
            <input
              name="title"
              placeholder="제목 (예: 칸 영화제 수상작)"
              className="field"
              required
            />
            <input
              name="slug"
              placeholder="slug (예: cannes-winners)"
              className="field"
              required
            />
            <input name="sort_order" placeholder="정렬 순서" className="field" />
            <textarea
              name="description"
              placeholder="설명"
              className="field"
              rows={2}
            />
            <button className="btn btn-accent">큐레이션 생성</button>
          </form>
        </Card>

        <Card title="큐레이션에 영화 추가" kicker="Curations">
          {curations.length > 0 ? (
            <form action={addMovieToCuration} className="space-y-3">
              <select name="curationId" className="field" required>
                {curations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="tmdbId"
                  placeholder="TMDb ID"
                  className="field"
                  required
                />
                <input name="position" placeholder="순서" className="field" />
              </div>
              <input name="note" placeholder="코멘트 (선택)" className="field" />
              <button className="btn btn-accent">영화 추가</button>
            </form>
          ) : (
            <p className="text-sm text-muted">먼저 큐레이션을 생성하세요.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  kicker,
  children,
  className = "",
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-6 ${className}`}>
      <p className="kicker text-faint">{kicker}</p>
      <h2 className="headline mb-4 mt-2 text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-accent/30 bg-accent/[0.06] p-6 text-sm leading-relaxed text-bone/80">
      {children}
    </div>
  );
}
