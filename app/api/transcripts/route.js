/**
 * Transcript API Route
 * 
 * POST /api/transcripts
 * Body: { url: string }
 * Returns: { segments: Array, language: string, transcriptType: string }
 */

import { getProvider } from '@/app/lib/transcript-providers';
import { isValidYouTubeUrl } from '@/app/utils/youtube';

export async function POST(request) {
  console.log('[API /transcripts] POST request received');
  
  try {
    const { url } = await request.json();
    console.log('[API /transcripts] URL from request:', url);

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
    const provider = getProvider();
    console.log('[API /transcripts] Using provider:', provider.name);

    if (!provider.isConfigured()) {
      console.error(`[API /transcripts] Provider ${provider.name} is not configured`);
      return Response.json(
        { error: 'Transcript service unavailable' },
        { status: 503 }
      );
    }

    // Fetch transcript
    console.log('[API /transcripts] Fetching transcript...');
    const result = await provider.fetchTranscript(validation.videoId);
    console.log('[API /transcripts] Provider result:', result.error ? 'ERROR' : `${result.segments?.length} segments`);

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
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
