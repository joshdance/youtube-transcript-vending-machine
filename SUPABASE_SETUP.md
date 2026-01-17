# Supabase Setup Instructions

This guide will walk you through setting up Supabase for the YouTube Transcript Vending Machine application. The setup includes authentication and database configuration.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Your Supabase project already created (you have the URL: `https://lrgtmzgdjzdrtyynttqk.supabase.co`)

## Step 1: Verify Your Supabase Keys

The application needs a **Secret Key** (Supabase's server-side key) to bypass Row Level Security (RLS) for server-side operations like caching transcripts and tracking credits.

Your `.env.local` file should already have these Supabase keys configured:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lrgtmzgdjzdrtyynttqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET=sb_secret_...
```

**Note:** Supabase now uses `SUPABASE_SECRET` instead of the old `SUPABASE_SERVICE_ROLE_KEY`. The secret key starts with `sb_secret_`.

**Important:** Never commit the `SUPABASE_SECRET` key to version control! It grants full admin access to your database.

## Step 2: Run Database Migrations

The application uses two database tables:
- `transcripts` - Caches YouTube transcripts to avoid re-fetching
- `credits_usage` - Tracks per-user credit usage (1 credit per transcript)

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref lrgtmzgdjzdrtyynttqk
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

### Option B: Manual SQL Execution

If you prefer to run the SQL manually:

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/20260115000001_create_transcripts_table.sql`
5. Click **Run**
6. Create another new query
7. Copy and paste the contents of `supabase/migrations/20260115000002_create_credits_usage_table.sql`
8. Click **Run**

## Step 3: Configure Email Authentication

The application uses Supabase Auth with magic link email authentication.

### Enable Email Provider

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Find **Email** in the list of providers
3. Make sure it's **enabled** (toggle should be on)
4. Configure settings:
   - ✅ Enable email provider
   - ✅ Confirm email (recommended for production)
   - Set **Site URL** to your production URL (e.g., `https://yourdomain.com`)
   - For development, add `http://localhost:3000` to **Redirect URLs**

### Configure Redirect URLs

1. Still in **Authentication** → **URL Configuration**
2. Add these redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback` (replace with your actual domain)

## Step 4: Test the Setup

### Test Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000
3. Click "Sign in for additional features"
4. Enter your email address
5. Check your email for the magic link
6. Click the magic link - you should be redirected back to the app and logged in

### Test Credits Tracking

1. After logging in, you should see "Credits used: 0" in the header
2. Enter a YouTube URL and click "Get Transcript"
3. The transcript should load successfully
4. The credits counter should increment to "Credits used: 1"

### Verify Database

To verify the data is being stored:

1. Go to **Table Editor** in your Supabase dashboard
2. Check the `transcripts` table - you should see your cached transcript
3. Check the `credits_usage` table - you should see a row with:
   - `user_id`: Your user's ID
   - `action`: "transcript"
   - `youtube_url`: The URL you tested
   - `cache_hit`: false (first fetch) or true (subsequent fetches)

## Step 5: Environment Variables Checklist

Make sure your `.env.local` file has all these variables:

```env
# YouTube API (for metadata)
YOUTUBE_DATA_v3_KEY=your-key-here

# Google Gemini (for AI summaries)
GOOGLE_GEMINI_API_KEY=your-key-here

# Supabase (authentication & database)
NEXT_PUBLIC_SUPABASE_URL=https://lrgtmzgdjzdrtyynttqk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SECRET=sb_secret_...your-secret-key-here

# Transcript provider credentials
SUPADATA_API_KEY=your-supadata-key-here

# Transcript provider selection
TRANSCRIPT_PROVIDER=supadata
```

## Troubleshooting

### "Unauthorized" errors

- Make sure you've added the `SUPABASE_SECRET` to `.env.local`
- Restart your development server after adding environment variables
- Check that the secret key is correct in your Supabase dashboard (it starts with `sb_secret_`)

### Magic link not working

- Check that you've configured the redirect URL in Supabase Auth settings
- Make sure the email provider is enabled
- Check your spam folder for the magic link email
- Verify the Site URL matches your application URL

### Credits not tracking

- Verify the `credits_usage` table exists (run migrations if not)
- Check Row Level Security policies are applied correctly
- Look for errors in the browser console and server logs

### Database errors

- Make sure both migrations have been run successfully
- Check that RLS policies are enabled on both tables
- Verify the `SUPABASE_SECRET` key has been set correctly

## Production Deployment

When deploying to production:

1. Add all environment variables to your hosting platform (Vercel, Netlify, etc.)
2. Update the **Site URL** in Supabase Auth settings to your production domain
3. Add your production domain to **Redirect URLs** (both base URL and `/auth/callback`)
4. Never expose the `SUPABASE_SECRET` to the client (only use it in server-side code)

## Database Schema Reference

### `transcripts` table
- Stores cached YouTube transcripts
- Unique constraint on `youtube_url` to prevent duplicates
- Public read access, authenticated write access via RLS

### `credits_usage` table
- Tracks individual credit usage (1 row = 1 credit used)
- Indexed on `user_id` and `created_at` for fast queries
- Users can only read their own usage via RLS
- Records whether the transcript was a cache hit or fresh fetch

## Support

If you encounter issues:

1. Check the browser console for client-side errors
2. Check the server logs (terminal) for server-side errors
3. Verify all environment variables are set correctly
4. Ensure migrations have been run successfully
5. Check Supabase dashboard logs under **Logs** → **Auth** or **Postgres**
