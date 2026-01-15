-- Creates the transcripts cache table used by /api/transcripts and /api/store-transcript

create extension if not exists pgcrypto;

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  transcript_content jsonb,
  transcript_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure a single row per video/url for caching
create unique index if not exists transcripts_youtube_url_key
  on public.transcripts (youtube_url);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_transcripts_updated_at on public.transcripts;
create trigger set_transcripts_updated_at
before update on public.transcripts
for each row
execute function public.set_updated_at();

alter table public.transcripts enable row level security;

-- Transcripts are not user-specific; allow read access (optional but convenient).
drop policy if exists "transcripts_select_public" on public.transcripts;
create policy "transcripts_select_public"
on public.transcripts
for select
to anon, authenticated
using (true);

-- Allow authenticated inserts/updates (used by optional client-auth storage route).
drop policy if exists "transcripts_insert_authenticated" on public.transcripts;
create policy "transcripts_insert_authenticated"
on public.transcripts
for insert
to authenticated
with check (true);

drop policy if exists "transcripts_update_authenticated" on public.transcripts;
create policy "transcripts_update_authenticated"
on public.transcripts
for update
to authenticated
using (true)
with check (true);

