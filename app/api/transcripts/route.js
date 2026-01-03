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

export async function POST(request) {
  console.log('[API /transcripts] POST request received');
  
  try {
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
