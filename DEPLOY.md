# Vercel 배포 가이드

이 프로젝트는 Next.js App Router 표준 구조라 별도 빌드 설정 없이 Vercel 에 바로 배포됩니다.

## 1. Supabase 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여 실행
3. Project Settings → API 에서 다음 값 확인
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 공개 금지)

## 2. API 키 발급

- **TMDb**: themoviedb.org → Settings → API → `TMDB_API_KEY` (또는 v4 토큰 `TMDB_ACCESS_TOKEN`)
- **OMDb**: omdbapi.com → `OMDB_API_KEY`
- **KOFIC**: kobis.or.kr/kobisopenapi → `KOFIC_API_KEY`
- **검색**(택1): Brave / Google CSE / SerpAPI → `SEARCH_PROVIDER` + 해당 키

## 3. Vercel 배포

### 방법 A — 대시보드 (권장)

1. GitHub 의 `junlee122-bot/Flim` 저장소를 Vercel 에 Import
2. Framework Preset 은 자동으로 **Next.js** 감지됨 (그대로 둠)
3. **Environment Variables** 에 아래 값을 모두 입력 (Production + Preview)
4. **Deploy** 클릭

### 방법 B — CLI

```bash
npm i -g vercel
vercel link          # 프로젝트 연결
vercel env add ...   # 아래 변수들 등록
vercel --prod        # 배포
```

## 4. Vercel 환경변수 목록

| 변수 | 필수 | 설명 |
|---|---|---|
| `TMDB_API_KEY` 또는 `TMDB_ACCESS_TOKEN` | ✅ | 영화 메타데이터 |
| `OMDB_API_KEY` | 선택 | IMDb/Metacritic/RT 평점 |
| `KOFIC_API_KEY` | 선택 | 한국영화/박스오피스 |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 관리자/자동수집 쓰기 (서버 전용) |
| `SEARCH_PROVIDER` | 선택 | `brave` \| `google` \| `serpapi` |
| `BRAVE_SEARCH_KEY` / `GOOGLE_CSE_KEY`+`GOOGLE_CSE_CX` / `SERPAPI_KEY` | 선택 | 선택한 provider 키 |
| `ADMIN_SECRET` | ✅ | 관리자 로그인 비밀값 |

> 키가 일부 비어 있어도 빌드/배포는 성공하며, 해당 기능만 "설정 필요" 안내로 폴백합니다.
> 최소 동작: `TMDB_*` 만 있어도 검색/상세/자동추천(TMDb 폴백)이 작동합니다.

## 5. 배포 후 확인

- `/` 오늘의 추천(자동) + (KOFIC 키 설정 시) 박스오피스
- `/search?q=기생충` 검색
- `/movies/<tmdbId>` 상세 (한국영화면 KOFIC 보강 표시)
- `/admin` → `ADMIN_SECRET` 로그인 → 추천작/수상/평론/큐레이션 관리
