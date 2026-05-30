-- =============================================================
-- TV 시리즈 — series 테이블 (movies 와 분리). Supabase SQL Editor 실행.
-- =============================================================
create table if not exists public.series (
  id              uuid primary key default gen_random_uuid(),
  tmdb_id         integer unique not null,
  name            text not null,
  original_name   text,
  first_air_year  integer,
  overview        text,
  poster_path     text,
  backdrop_path   text,
  genres          text[] default '{}',
  country         text,
  tmdb_rating     numeric(3,1),
  vote_count      integer default 0,
  popularity      numeric default 0,
  number_of_seasons integer,
  weighted_rating numeric generated always as (
    (vote_count::numeric / (vote_count + 1000)) * coalesce(tmdb_rating, 0)
    + (1000::numeric / (vote_count + 1000)) * 7.0
  ) stored,
  created_at      timestamptz default now()
);
create index if not exists series_tmdb_idx on public.series (tmdb_id);

alter table public.series enable row level security;
create policy "public read series" on public.series for select using (true);
