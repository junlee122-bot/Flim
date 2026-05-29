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

const input =
  "w-full rounded-sm border border-bone/15 bg-ink-800 px-3 py-2 text-sm focus:border-accent focus:outline-none";
const btn =
  "rounded-sm bg-accent px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <Notice>
        Supabase 가 설정되지 않았습니다. <code>.env.local</code> 에 Supabase URL/키를
        추가하고 <code>supabase/schema.sql</code> 을 실행하세요.
      </Notice>
    );
  }

  if (!admin) {
    return (
      <div className="max-w-sm space-y-4">
        <div>
          <p className="kicker">ADMIN</p>
          <h1 className="headline mt-1 text-3xl">관리자 로그인</h1>
        </div>
        <form action={login} className="space-y-3">
          <input
            name="secret"
            type="password"
            placeholder="ADMIN_SECRET"
            className={input}
          />
          <button className={btn} type="submit">
            로그인
          </button>
        </form>
        <p className="text-xs text-muted">
          MVP 인증입니다. <code>.env.local</code> 의 <code>ADMIN_SECRET</code> 값과
          일치해야 합니다.
        </p>
      </div>
    );
  }

  const curations = await getCurations();

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between border-b border-bone/10 pb-4">
        <div>
          <p className="kicker">ADMIN</p>
          <h1 className="headline mt-1 text-3xl">관리자</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/reviews" className="text-accent hover:underline">
            평론 검토 대기 →
          </Link>
          <form action={logout}>
            <button className="text-muted hover:text-bone">로그아웃</button>
          </form>
        </div>
      </div>

      <p className="text-sm text-muted">
        모든 작업은 TMDb ID 기준입니다. (검색 페이지에서 영화를 누르면 URL
        <code> /movies/&lt;TMDb ID&gt;</code> 에서 확인)
      </p>

      <Card title="오늘의 추천 영화 지정">
        <form action={setDailyPick} className="space-y-3">
          <input name="tmdbId" placeholder="TMDb ID" className={input} required />
          <input name="date" type="date" className={input} />
          <input name="reason" placeholder="추천 이유 (선택)" className={input} />
          <button className={btn}>추천작 지정</button>
        </form>
      </Card>

      <Card title="수상 정보 추가">
        <form action={addAward} className="space-y-3">
          <input name="tmdbId" placeholder="TMDb ID" className={input} required />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="festival"
              placeholder="영화제 (예: 칸, 오스카)"
              className={input}
              required
            />
            <input name="category" placeholder="부문 (예: 황금종려상)" className={input} />
            <input name="year" placeholder="연도" className={input} />
            <select name="result" className={input}>
              <option value="won">수상</option>
              <option value="nominated">후보</option>
            </select>
          </div>
          <input name="note" placeholder="비고 (선택)" className={input} />
          <button className={btn}>수상 정보 추가</button>
        </form>
      </Card>

      <Card title="평론가 코멘트 직접 등록 (즉시 공개)">
        <form action={addManualReview} className="space-y-3">
          <input name="tmdbId" placeholder="TMDb ID" className={input} required />
          <div className="grid grid-cols-2 gap-3">
            <input name="critic_name" placeholder="평론가명" className={input} required />
            <input name="source_name" placeholder="출처 (예: 씨네21)" className={input} />
            <input name="rating" placeholder="별점 (5점 만점)" className={input} />
            <input name="source_url" placeholder="원문 링크" className={input} />
          </div>
          <input name="short_quote" placeholder="한줄평 (짧은 인용)" className={input} />
          <textarea name="summary" placeholder="핵심 요약" className={input} rows={2} />
          <button className={btn}>코멘트 등록</button>
        </form>
      </Card>

      <Card title="큐레이션 리스트 생성">
        <form action={createCuration} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="title" placeholder="제목 (예: 칸 영화제 수상작)" className={input} required />
            <input name="slug" placeholder="slug (예: cannes-winners)" className={input} required />
            <input name="sort_order" placeholder="정렬 순서" className={input} />
          </div>
          <textarea name="description" placeholder="설명" className={input} rows={2} />
          <button className={btn}>큐레이션 생성</button>
        </form>
      </Card>

      <Card title="큐레이션에 영화 추가">
        {curations.length > 0 ? (
          <form action={addMovieToCuration} className="space-y-3">
            <select name="curationId" className={input} required>
              {curations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input name="tmdbId" placeholder="TMDb ID" className={input} required />
              <input name="position" placeholder="순서" className={input} />
            </div>
            <input name="note" placeholder="코멘트 (선택)" className={input} />
            <button className={btn}>영화 추가</button>
          </form>
        ) : (
          <p className="text-sm text-muted">먼저 큐레이션을 생성하세요.</p>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-bone/10 bg-ink-900 p-5">
      <h2 className="headline mb-4 text-lg">{title}</h2>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-accent/30 bg-accent/5 p-5 text-sm text-bone/80">
      {children}
    </div>
  );
}
