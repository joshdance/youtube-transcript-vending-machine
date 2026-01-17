/**
 * Transcript API Route
 * 
 * POST /api/transcripts
 * Body: { 
 *   url: string,
 *   language?: string (default: 'en'),
 *   chunkSize?: number (50-10000, controls segment granularity),
 *   mode?: string ('native' | 'auto' | 'generate')
 * }
 * Returns: { segments: Array, language: string, transcriptType: string }
 */

import { getProvider } from '@/app/lib/transcript-providers';
import { isValidYouTubeUrl } from '@/app/utils/youtube';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getCanonicalYouTubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

async function getAccessTokenFromRequest(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice('bearer '.length).trim();
  }

  // Fallback: try Supabase auth cookie (project-specific name), e.g. "sb-<ref>-auth-token"
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    const authCookie = all.find((c) => c.name.endsWith('-auth-token'));
    if (!authCookie?.value) return null;

    const parsed = JSON.parse(authCookie.value);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

function getSupabaseCacheClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) return null;

  // Prefer secret key for server-side caching (bypasses RLS).
  if (secretKey) {
    return createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // Fall back to anon key (may fail if RLS blocks reads/writes).
  if (anonKey) {
    return createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return null;
}

async function getAuthenticatedUser(request) {
  const accessToken = await getAccessTokenFromRequest(request);
  if (!accessToken) return { user: null, accessToken: null, error: 'Missing auth token' };

  const supabase = getSupabaseCacheClient();
  if (!supabase) return { user: null, accessToken: null, error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { user: null, accessToken: null, error: error?.message || 'Invalid auth token' };
  }

  return { user: data.user, accessToken, error: null };
}

async function recordCreditUsage({
  userId,
  youtubeUrl,
  videoId,
  cacheHit,
  provider,
}) {
  const supabase = getSupabaseCacheClient();
  if (!supabase) return;

  await supabase.from('credits_usage').insert([
    {
      user_id: userId,
      action: 'transcript',
      youtube_url: youtubeUrl,
      video_id: videoId,
      cache_hit: !!cacheHit,
      provider: provider || null,
    },
  ]);
}

export async function POST(request) {
  console.log('[API /transcripts] POST request received');
  
  try {
    // Credits require an authenticated user
    const auth = await getAuthenticatedUser(request);
    if (!auth.user) {
      return Response.json(
        { error: 'Unauthorized: please sign in to use credits' },
        { status: 401 }
      );
    }

    const { url, language, chunkSize, mode } = await request.json();
    console.log('[API /transcripts] Request params:', { 
      url, 
      language, 
      chunkSize, 
      mode 
    });

    if (!url) {
      console.log('[API /transcripts] No URL provided');
      return Response.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Validate URL and extract video ID
    const validation = isValidYouTubeUrl(url);
    console.log('[API /transcripts] URL validation result:', validation);
    
    if (!validation.isValid) {
      console.log('[API /transcripts] Invalid URL');
      return Response.json(
        { error: validation.message || 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    if (!validation.videoId) {
      console.log('[API /transcripts] No video ID extracted');
      return Response.json(
        { error: 'Could not extract video ID from URL' },
        { status: 400 }
      );
    }

    console.log('[API /transcripts] Video ID:', validation.videoId);

    // Try Supabase cache first to avoid paid provider calls
    const canonicalUrl = getCanonicalYouTubeUrl(validation.videoId);
    const supabase = getSupabaseCacheClient();
    if (supabase) {
      try {
        const urlsToCheck = Array.from(new Set([url, canonicalUrl]));
        console.log('[API /transcripts] Checking Supabase cache for URLs:', urlsToCheck);

        const { data: cachedRows, error: cacheError } = await supabase
          .from('transcripts')
          .select('transcript_content, youtube_url')
          .in('youtube_url', urlsToCheck)
          .not('transcript_content', 'is', null)
          .limit(1);

        if (cacheError) {
          console.warn('[API /transcripts] Cache lookup error (continuing):', cacheError.message);
        } else if (cachedRows && cachedRows.length > 0 && cachedRows[0]?.transcript_content) {
          console.log('[API /transcripts] Cache hit from:', cachedRows[0].youtube_url);
          try {
            await recordCreditUsage({
              userId: auth.user.id,
              youtubeUrl: canonicalUrl,
              videoId: validation.videoId,
              cacheHit: true,
              provider: 'supabase-cache',
            });
          } catch (e) {
            console.warn('[API /transcripts] Failed to record credit usage (continuing):', e?.message || e);
          }
          return Response.json({
            segments: cachedRows[0].transcript_content,
            language: language || 'en',
            transcriptType: 'cached',
            provider: 'supabase-cache',
            cacheHit: true,
          });
        } else {
          console.log('[API /transcripts] Cache miss');
        }
      } catch (err) {
        console.warn('[API /transcripts] Cache lookup exception (continuing):', err?.message || err);
      }
    } else {
      console.log('[API /transcripts] Supabase cache not configured (missing env)');
    }

    // Get the configured provider
    console.log('[API /transcripts] Getting provider...');
    console.log('[API /transcripts] TRANSCRIPT_PROVIDER env:', process.env.TRANSCRIPT_PROVIDER);
    const provider = getProvider();
    console.log('[API /transcripts] Provider obtained:', {
      name: provider.name,
      type: typeof provider,
      hasFetchTranscript: typeof provider.fetchTranscript === 'function',
      hasIsConfigured: typeof provider.isConfigured === 'function'
    });

    console.log('[API /transcripts] Checking if provider is configured...');
    const isConfigured = provider.isConfigured();
    console.log('[API /transcripts] Provider configured:', isConfigured);

    if (!isConfigured) {
      console.error(`[API /transcripts] Provider ${provider.name} is not configured`);
      console.log('[API /transcripts] Environment check:', {
        SUPADATA_API_KEY: process.env.SUPADATA_API_KEY ? 'SET (hidden)' : 'NOT SET',
        SUPADATA_API_KEY_LENGTH: process.env.SUPADATA_API_KEY?.length || 0
      });
      return Response.json(
        { error: 'Transcript service unavailable' },
        { status: 503 }
      );
    }

    // Fetch transcript
    console.log('[API /transcripts] Calling provider.fetchTranscript()...');
    console.log('[API /transcripts] Video ID:', validation.videoId);
    console.log('[API /transcripts] Options:', { language, chunkSize, mode });
    let result;
    try {
      result = await provider.fetchTranscript(validation.videoId, {
        language,
        chunkSize,
        mode
      });
      console.log('[API /transcripts] Provider result received:', {
        hasError: !!result.error,
        hasSegments: !!result.segments,
        segmentCount: result.segments?.length || 0,
        errorCode: result.error?.code,
        errorMessage: result.error?.message
      });
    } catch (err) {
      console.error('[API /transcripts] Exception during fetchTranscript:', err);
      console.error('[API /transcripts] Exception details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw err;
    }

    if (result.error) {
      console.error(`[API /transcripts] Provider ${provider.name} error:`, result.error);
      
      // Map error codes to HTTP status
      const statusMap = {
        'NOT_FOUND': 404,
        'NOT_CONFIGURED': 503,
        'AUTH_FAILED': 503,
        'FORBIDDEN': 503,
        'BAD_REQUEST': 400,
        'RATE_LIMITED': 429,
        'TIMEOUT': 504,
      };
      
      const status = statusMap[result.error.code] || 500;
      return Response.json({ error: result.error.message }, { status });
    }

    // Return successful result
    console.log('[API /transcripts] Success! Returning', result.segments?.length, 'segments');

    // Best-effort: store transcript in Supabase for future cache hits
    if (result?.segments && Array.isArray(result.segments) && result.segments.length > 0) {
      const supabaseForWrite = getSupabaseCacheClient();
      if (supabaseForWrite) {
        try {
          const insertData = {
            youtube_url: canonicalUrl,
            transcript_content: result.segments,
          };

          const { error: insertError } = await supabaseForWrite
            .from('transcripts')
            .upsert([insertData], { onConflict: 'youtube_url' });

          if (insertError) {
            console.warn('[API /transcripts] Failed to cache transcript (continuing):', insertError.message);
          } else {
            console.log('[API /transcripts] Cached transcript in Supabase for:', canonicalUrl);
          }
        } catch (err) {
          console.warn('[API /transcripts] Cache write exception (continuing):', err?.message || err);
        }
      }
    }

    // Record 1 credit usage for this transcript request (best-effort)
    try {
      await recordCreditUsage({
        userId: auth.user.id,
        youtubeUrl: canonicalUrl,
        videoId: validation.videoId,
        cacheHit: false,
        provider: result.provider || provider.name,
      });
    } catch (e) {
      console.warn('[API /transcripts] Failed to record credit usage (continuing):', e?.message || e);
    }

    return Response.json(result);

  } catch (error) {
    console.error('[API /transcripts] Unhandled error:', error);
    console.error('[API /transcripts] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return Response.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
