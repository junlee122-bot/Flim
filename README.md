# FLIM — 씨네필 영화 큐레이션·비평 아카이브

한 작품의 **정보·평점·수상·평론**을 한 화면에 정리하는 큐레이션/비평 아카이브.
단순 검색이 아니라 Letterboxd · Criterion · MUBI · 영화 잡지의 감성을 지향합니다.

**Production:** https://flim-eight.vercel.app

## 기술 스택

- Next.js (App Router) · TypeScript · Tailwind CSS
- Supabase (Postgres + RLS)
- TMDb API (메타데이터) · OMDb API (외부 평점) · KOFIC API (한국영화/박스오피스)
- 배포: Vercel

## MVP 기능

- 메인: **오늘의 추천 영화**(평점·수상 기반 자동 추천) + 씨네필 **큐레이션** + **KOFIC 박스오피스**
- **영화 검색** (제목 → 포스터/원제/연도)
- **영화 상세**: 기본정보 · 포스터/스틸컷 · TMDb/IMDb/Metacritic/RT 평점 · 수상 경력 · 평론가 코멘트 · (한국영화) **KOFIC 보강**
- **평론가 평 자동 검색** (저작권 준수: 짧은 인용/요약 + 원문 링크만, 검토 대기 → 관리자 승인 후 공개)
- **관리자**: 추천작 지정 · 수상/평론 등록 · 큐레이션 생성/영화 추가 · 평론 검토(승인/거절)

## 설정

1. 의존성 설치
   ```bash
   npm install
   ```
2. 환경변수: `.env.local.example` → `.env.local` 로 복사 후 채우기
   - `TMDB_API_KEY` 또는 `TMDB_ACCESS_TOKEN` (필수)
   - `OMDB_API_KEY` (외부 평점), `KOFIC_API_KEY` (한국영화)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `SEARCH_PROVIDER` (`brave`|`google`|`serpapi`) + 해당 API 키
   - `ADMIN_SECRET` (관리자 로그인)
3. Supabase: `supabase/schema.sql` 을 SQL Editor 에서 실행
4. 실행
   ```bash
   npm run dev
   ```

> 키가 없어도 빌드/렌더는 되며, 각 화면이 "설정 필요" 안내로 폴백합니다.

## 평론 자동 검색 설계

`src/lib/search/` — 검색 API 추상화:

- `provider.ts` : `SearchProvider` 인터페이스
- `google.ts` / `serpapi.ts` / `brave.ts` : 구현체
- `index.ts` : `SEARCH_PROVIDER` env 로 구현체 선택
- `parser.ts` : 쿼리 조합(`평론가 제목 별점/한줄평`, `씨네21 평론가 제목`), 출처 우선순위(씨네21·공식 > 왓챠·언론 > 커뮤니티), 별점/한줄평 추출, `confidence_score` 산출

흐름: 상세 페이지의 **자동 검색** 버튼 → `POST /api/critic-reviews/search`(후보 미리보기) →
관리자가 선택 저장 `POST /api/critic-reviews/save` (`status=pending`, `origin=auto`) →
`/admin/reviews` 에서 승인 → 상세 페이지 공개.

**전문은 수집하지 않습니다.** 짧은 한줄평/요약과 원문 링크만 저장합니다.

## 추천 / KOFIC 로직

- **오늘의 추천** (`src/lib/recommend.ts`): ① 관리자 지정 → ② DB 영화 점수화(TMDb 평점 + 수상 가산점) → ③ TMDb top_rated 폴백. 같은 날엔 동일 작품, 날마다 회전(날짜 시드).
- **KOFIC** (`src/lib/kofic.ts`): 메인의 일별 박스오피스, 한국영화 상세의 개봉일·등급·제작상태·배급사 보강.

## 배포

Vercel 배포는 [`DEPLOY.md`](./DEPLOY.md) 참고. (환경변수 목록 포함)

라이브 사이트에 실제 데이터가 나오게 하려면 Vercel 프로젝트 설정에 환경변수(TMDb·Supabase·OMDb·KOFIC·검색·ADMIN_SECRET)를 추가하면 됩니다.

## 확장 포인트

- 추천 기준: 현재 평점·수상 기반. 장르/관심도/협업필터로 확장 가능.
- 평론가: `critics` 테이블 / `src/lib/critics.ts` 에 추가 (박평식·김혜리·정성일 등).
- 관리자 인증: 현재 단순 시크릿 쿠키 → Supabase Auth + role 로 교체 권장.
