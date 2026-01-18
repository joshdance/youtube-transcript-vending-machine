-- Adds Stripe metadata and credit purchases ledger

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists stripe_customer_id text;

create unique index if not exists users_stripe_customer_id_key
  on public.users (stripe_customer_id);

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text not null,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  credits integer not null,
  amount_total integer,
  currency text,
  status text,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_purchases_stripe_session_id_key
  on public.credit_purchases (stripe_session_id);

create index if not exists credit_purchases_user_id_created_at_idx
  on public.credit_purchases (user_id, created_at desc);

alter table public.credit_purchases enable row level security;

drop policy if exists "credit_purchases_select_own" on public.credit_purchases;
create policy "credit_purchases_select_own"
on public.credit_purchases
for select
to authenticated
using (user_id = auth.uid());

