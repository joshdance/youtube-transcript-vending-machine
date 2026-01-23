# How to Run Migrations

## Option 1: Using Supabase CLI (Recommended)

1. **Login to Supabase CLI:**
   ```bash
   supabase login
   ```
   (This will open a browser for authentication)

2. **Link your project:**
   ```bash
   supabase link --project-ref fuviucztdczjjvqaqiry
   ```

3. **Push migrations:**
   ```bash
   supabase db push
   ```

4. **List migrations:**
   ```bash
   supabase migration list
   ```

## Option 2: Manual SQL Execution (No CLI needed)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/fuviucztdczjjvqaqiry
2. Click **SQL Editor** in the left sidebar
3. For each migration file below, create a new query, copy/paste the SQL, and click **Run**:

   **Run in this order:**
   1. `20260115000001_create_transcripts_table.sql`
   2. `20260115000002_create_credits_usage_table.sql`
   3. `20260118000001_create_users_table.sql` ⚠️ **IMPORTANT - Creates users table**
   4. `20260118000002_add_stripe_payments.sql`
   5. `20260118000003_add_credit_atomic_updates.sql`
   6. `20260123000001_add_credits_usage_foreign_key.sql`

## Check Which Migrations Have Been Applied

Run this SQL in the Supabase SQL Editor:
```sql
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY inserted_at DESC;
```

Or check which tables exist in the **Table Editor**:
- `transcripts`
- `credits_usage`
- `users` ⚠️ **This is the one you're missing!**
- `credit_purchases`
