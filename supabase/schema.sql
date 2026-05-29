-- =============================================================
-- Flim — 씨네필 영화 큐레이션/비평 아카이브
-- Supabase 스키마 (MVP)
-- Supabase SQL Editor에 그대로 붙여 실행하세요.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- movies : TMDb 데이터의 로컬 캐시/참조.
-- 큐레이션·수상·평론이 이 행을 FK 로 참조한다.
-- -------------------------------------------------------------
create table if not exists public.movies (
  id              uuid primary key default gen_random_uuid(),
  tmdb_id         integer unique not null,
  imdb_id         text,
  title           text not null,
  original_title  text,
  release_year    integer,
  director        text,
  country         text,
  runtime         integer,
  overview        text,
  poster_path     text,
  backdrop_path   text,
  genres          text[] default '{}',
  tmdb_rating     numeric(3,1),
  vote_count      integer default 0,
  popularity      numeric default 0,
  -- 베이지안 가중평점 (m=3000, C=6.5): 투표 적을수록 평균으로 보정
  weighted_rating numeric generated always as (
    (vote_count::numeric / (vote_count + 3000)) * coalesce(tmdb_rating, 0)
    + (3000::numeric / (vote_count + 3000)) * 6.5
  ) stored,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists movies_tmdb_id_idx on public.movies (tmdb_id);

-- -------------------------------------------------------------
-- awards : 오스카/칸/베니스/베를린 등 주요 수상 정보
-- -------------------------------------------------------------
create table if not exists public.awards (
  id         uuid primary key default gen_random_uuid(),
  movie_id   uuid references public.movies(id) on delete cascade,
  festival   text not null,          -- oscar | cannes | venice | berlin | ...
  category   text,                   -- 황금종려상, 작품상, 감독상 ...
  year       integer,
  result     text default 'won',     -- won | nominated
  note       text,
  created_at timestamptz default now()
);
create index if not exists awards_movie_idx on public.awards (movie_id);

-- -------------------------------------------------------------
-- critics : 자동검색 대상 평론가 목록 (이동진/박평식/김혜리/정성일 ...)
-- -------------------------------------------------------------
create table if not exists public.critics (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique not null,
  default_source text,               -- 예: 씨네21
  official_url   text,
  active          boolean default true,
  created_at     timestamptz default now()
);

-- -------------------------------------------------------------
-- critic_reviews : 평론가 한줄평/별점/요약 (자동수집 + 수동등록)
--  * 전문 미수집 — 짧은 인용/요약 + 원문 링크만 저장
--  * status 로 검토 워크플로우 (pending → approved/rejected)
-- -------------------------------------------------------------
create table if not exists public.critic_reviews (
  id               uuid primary key default gen_random_uuid(),
  movie_id         uuid references public.movies(id) on delete cascade,
  critic_name      text not null,
  source_name      text,             -- 씨네21, 왓챠피디아, 블로그 ...
  source_url       text,             -- 원문 출처 (필수 권장)
  rating           numeric(3,1),     -- 별점 (5점 만점 정규화)
  short_quote      text,             -- 짧은 한줄평
  summary          text,             -- 핵심 요약
  collected_at     timestamptz default now(),
  status           text default 'pending'
                     check (status in ('pending','approved','rejected')),
  confidence_score numeric(3,2) default 0,  -- 0.00 ~ 1.00
  origin           text default 'manual'    -- manual | auto
                     check (origin in ('manual','auto')),
  created_at       timestamptz default now()
);
create index if not exists reviews_movie_idx  on public.critic_reviews (movie_id);
create index if not exists reviews_status_idx on public.critic_reviews (status);

-- -------------------------------------------------------------
-- curations : 큐레이션 리스트 (입문 고전, 칸 수상작, 이동진 추천 ...)
-- -------------------------------------------------------------
create table if not exists public.curations (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text,
  cover_image  text,
  sort_order   integer default 0,
  is_published boolean default true,
  created_at   timestamptz default now()
);

create table if not exists public.curation_movies (
  curation_id uuid references public.curations(id) on delete cascade,
  movie_id    uuid references public.movies(id) on delete cascade,
  position    integer default 0,
  note        text,
  primary key (curation_id, movie_id)
);

-- -------------------------------------------------------------
-- daily_picks : 오늘의 추천 영화 (날짜별 1편)
-- -------------------------------------------------------------
create table if not exists public.daily_picks (
  id         uuid primary key default gen_random_uuid(),
  movie_id   uuid references public.movies(id) on delete cascade,
  pick_date  date unique not null default current_date,
  reason     text,
  created_at timestamptz default now()
);

-- =============================================================
-- RLS : 공개 콘텐츠는 익명 읽기 허용, 쓰기는 service_role 만.
-- (관리자 작업은 서버에서 service role key 로 수행)
-- =============================================================
alter table public.movies          enable row level security;
alter table public.awards          enable row level security;
alter table public.critics         enable row level security;
alter table public.critic_reviews  enable row level security;
alter table public.curations       enable row level security;
alter table public.curation_movies enable row level security;
alter table public.daily_picks     enable row level security;

-- 익명/인증 사용자 읽기 허용
create policy "public read movies"          on public.movies          for select using (true);
create policy "public read awards"          on public.awards          for select using (true);
create policy "public read critics"         on public.critics         for select using (true);
create policy "public read curations"       on public.curations       for select using (true);
create policy "public read curation_movies" on public.curation_movies for select using (true);
create policy "public read daily_picks"     on public.daily_picks     for select using (true);
-- 평론은 승인된 것만 공개
create policy "public read approved reviews" on public.critic_reviews
  for select using (status = 'approved');

-- service_role 은 RLS 를 우회하므로 별도 쓰기 정책 불필요.

-- =============================================================
-- seed : 기본 평론가
-- =============================================================
insert into public.critics (name, slug, default_source, official_url) values
  ('이동진', 'lee-dong-jin', '씨네21', null),
  ('박평식', 'park-pyeong-sik', '씨네21', null),
  ('김혜리', 'kim-hye-ri', '씨네21', null),
  ('정성일', 'jung-sung-il', '씨네21', null)
on conflict (slug) do nothing;
