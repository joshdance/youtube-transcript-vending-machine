-- Adds credit purchase tracking fields and atomic credit updates

create extension if not exists pgcrypto;

alter table public.credit_purchases
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_dispute_id text,
  add column if not exists refund_amount integer,
  add column if not exists refunded_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists credit_purchases_payment_intent_idx
  on public.credit_purchases (stripe_payment_intent_id);

create index if not exists credit_purchases_charge_id_idx
  on public.credit_purchases (stripe_charge_id);

create index if not exists credit_purchases_dispute_id_idx
  on public.credit_purchases (stripe_dispute_id);

drop trigger if exists set_credit_purchases_updated_at on public.credit_purchases;
create trigger set_credit_purchases_updated_at
before update on public.credit_purchases
for each row
execute function public.set_updated_at();

create or replace function public.increment_user_credits(
  p_user_id uuid,
  p_delta integer
)
returns table (credits_balance integer, credits_added integer)
language plpgsql
as $$
begin
  update public.users
  set credits_balance = credits_balance + p_delta,
      credits_added = credits_added + greatest(p_delta, 0),
      updated_at = now()
  where id = p_user_id
  returning public.users.credits_balance, public.users.credits_added
    into credits_balance, credits_added;

  if not found then
    raise exception 'User not found';
  end if;

  return;
end;
$$;
