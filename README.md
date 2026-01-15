# YouTube Transcript Vending Machine

This application allows you to extract transcripts from YouTube videos using multiple provider options (Supadata, YouTube Transcript API, or Oxylabs).

## Features

- Simple interface to input YouTube video URLs
- Extract video transcripts using configurable providers
- View metadata and transcript content
- Adjustable segment granularity
- Support for multiple languages

## Getting Started

First, configure your transcript provider in `.env.local`:

### Using Supadata (Recommended)

1. Sign up for a Supadata account at [https://supadata.ai](https://supadata.ai)
2. Get your API key from the dashboard
3. Add to `.env.local`:

```
TRANSCRIPT_PROVIDER=supadata
SUPADATA_API_KEY=your_supadata_api_key_here
```

### Using YouTube Transcript API (No API key required)

```
TRANSCRIPT_PROVIDER=youtube-transcript
```

### Using Oxylabs

```
TRANSCRIPT_PROVIDER=oxylabs
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
```

## Transcript Storage / Cache (Supabase)

The transcript endpoint (`/api/transcripts`) will **check Supabase first** and return a cached transcript (if present) before calling the configured transcript provider. On a cache miss, it will fetch via the provider and then **store the transcript in Supabase** for future requests.

To enable server-side caching (recommended), set:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

If you don’t set `SUPABASE_SERVICE_ROLE_KEY`, the server will fall back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which may not work if your `transcripts` table has RLS enabled for reads/writes.

## Credits (1 credit per transcript request)

Transcript fetching requires a signed-in user. Each successful transcript request records **1 credit** in Supabase (even if served from cache) so you can track usage per user.

### Required Supabase table

Create a `credits_usage` table (server writes use `SUPABASE_SERVICE_ROLE_KEY`):

```sql
create table if not exists public.credits_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  youtube_url text,
  video_id text,
  cache_hit boolean default false,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists credits_usage_user_id_created_at_idx
  on public.credits_usage (user_id, created_at desc);
```

### API

- `POST /api/transcripts`: requires auth; records 1 credit on success
- `GET /api/credits`: returns `{ creditsUsed }` for the signed-in user

Then, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use

1. Enter a YouTube URL in the input field
2. Click "Get Transcript"
3. The transcript will be displayed below the input field

## AI Summary Provider (Vercel AI Gateway)

The summary endpoint (`/api/ai-summary`) can use **Vercel AI Gateway** (recommended) or fall back to **Google Gemini**.

### AI Gateway env

```
AI_SUMMARY_BACKEND=gateway
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
# Optional (defaults shown)
AI_GATEWAY_BASE_URL=https://gateway.ai.vercel.com/v1
AI_SUMMARY_MODEL=openai:gpt-4o-mini
```

### Gemini env (fallback)

```
AI_SUMMARY_BACKEND=gemini
GOOGLE_GEMINI_API_KEY=your_gemini_key
# Optional (defaults shown)
GOOGLE_GEMINI_MODEL=gemini-2.0-flash
```

## Cost Estimation

`POST /api/cost-estimate` estimates the cost to fetch a transcript + summarize it.

- Provide `transcript` (preferred) to estimate from actual transcript size, or `durationSeconds` as a fallback.
- Configure pricing using env vars (USD per 1M tokens):

```
AI_SUMMARY_INPUT_USD_PER_1M=0
AI_SUMMARY_OUTPUT_USD_PER_1M=0
AI_SUMMARY_ESTIMATED_COMPLETION_TOKENS=800

# If using paid transcript providers:
OXYLABS_COST_USD_PER_REQUEST=0
SUPADATA_COST_USD_PER_REQUEST=0
```

## Technologies Used

- Next.js
- React
- Tailwind CSS
- Supadata API (or other configured provider)

## License

This project is open source and available under the [MIT License](LICENSE).

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supadata Documentation](https://docs.supadata.ai)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
