-- =============================================================
-- 계정 동기화 — user_movies (별점/봤어요를 서버에 저장)
-- Supabase SQL Editor 에 붙여 실행. (Auth 는 이메일 매직링크 사용)
-- =============================================================

create table if not exists public.user_movies (
  user_id     uuid not null references auth.users(id) on delete cascade,
  tmdb_id     integer not null,
  title       text,
  poster_url  text,
  year        integer,
  rating      numeric(2,1),          -- 0.5~5.0, null 이면 별점 없음
  watched     boolean default false,
  updated_at  timestamptz default now(),
  primary key (user_id, tmdb_id)
);

alter table public.user_movies enable row level security;

-- 본인 행만 읽기/쓰기
create policy "own rows select" on public.user_movies
  for select using (auth.uid() = user_id);
create policy "own rows insert" on public.user_movies
  for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.user_movies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.user_movies
  for delete using (auth.uid() = user_id);
