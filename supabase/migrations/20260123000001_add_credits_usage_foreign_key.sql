-- Adds foreign key constraint to credits_usage.user_id
-- This ensures referential integrity with auth.users

-- Drop the constraint if it already exists (idempotent)
alter table public.credits_usage
  drop constraint if exists credits_usage_user_id_fkey;

-- Add foreign key constraint to credits_usage.user_id
-- This ensures that all user_id values in credits_usage reference valid auth.users
alter table public.credits_usage
  add constraint credits_usage_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;
