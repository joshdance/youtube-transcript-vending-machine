-- Fix the increment_user_credits function to resolve ambiguous column reference
-- This fixes the error: column reference "credits_balance" is ambiguous

create or replace function public.increment_user_credits(
  p_user_id uuid,
  p_delta integer
)
returns table (credits_balance integer, credits_added integer)
language plpgsql
as $$
declare
  v_credits_balance integer;
  v_credits_added integer;
begin
  update public.users
  set credits_balance = public.users.credits_balance + p_delta,
      credits_added = public.users.credits_added + greatest(p_delta, 0),
      updated_at = now()
  where id = p_user_id
  returning public.users.credits_balance, public.users.credits_added
    into v_credits_balance, v_credits_added;

  if not found then
    raise exception 'User not found';
  end if;

  return query select v_credits_balance, v_credits_added;
end;
$$;
