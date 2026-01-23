-- Query to check which migrations have been applied to your Supabase database
-- Run this in the Supabase SQL Editor

-- Check the supabase_migrations.schema_migrations table
SELECT 
  version,
  name,
  inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC;

-- Alternative: Check which tables exist (indirect way to see if migrations ran)
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('transcripts', 'credits_usage', 'users', 'credit_purchases')
ORDER BY table_name;
