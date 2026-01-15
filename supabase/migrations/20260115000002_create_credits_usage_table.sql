-- Creates the credits usage ledger (1 row = 1 credit)

create extension if not exists pgcrypto;

create table if not exists public.credits_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  youtube_url text,
  video_id text,
  cache_hit boolean not null default false,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists credits_usage_user_id_created_at_idx
  on public.credits_usage (user_id, created_at desc);

create index if not exists credits_usage_action_created_at_idx
  on public.credits_usage (action, created_at desc);

alter table public.credits_usage enable row level security;

-- Users can read their own usage rows.
drop policy if exists "credits_usage_select_own" on public.credits_usage;
create policy "credits_usage_select_own"
on public.credits_usage
for select
to authenticated
using (user_id = auth.uid());

-- Allow users to insert only their own rows (optional; server uses service role and bypasses RLS).
drop policy if exists "credits_usage_insert_own" on public.credits_usage;
create policy "credits_usage_insert_own"
on public.credits_usage
for insert
to authenticated
with check (user_id = auth.uid());

