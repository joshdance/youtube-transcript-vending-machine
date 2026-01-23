-- Grant 20 credits to user: joshua.dance@gmail.com
-- User ID: 26504667-dabb-4708-85ab-b65f7316c7b4

-- Step 1: Ensure the user record exists in the users table
INSERT INTO public.users (id, email, credits_balance, credits_added)
VALUES (
  '26504667-dabb-4708-85ab-b65f7316c7b4',
  'joshua.dance@gmail.com',
  0,
  0
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email;

-- Step 2: Add 20 credits using the atomic increment function
SELECT * FROM public.increment_user_credits(
  '26504667-dabb-4708-85ab-b65f7316c7b4'::uuid,
  20
);

-- Step 3: Verify the credits were added
SELECT 
  id,
  email,
  credits_balance,
  credits_added,
  updated_at
FROM public.users
WHERE id = '26504667-dabb-4708-85ab-b65f7316c7b4';
