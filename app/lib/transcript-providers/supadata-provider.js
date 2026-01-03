/**
 * Supadata YouTube Transcript Provider
 * 
 * Uses the Supadata API for YouTube transcript extraction.
 * 
 * Website: https://supadata.ai/youtube-transcript-api
 * Documentation: https://docs.supadata.ai/integrations/node
 * - 100 free requests without credit card
 * - Accurate, time-stamped transcripts
 */

import { Supadata, SupadataError } from '@supadata/js';
import { msToTimestamp } from './utils.js';

export class SupadataProvider {
  name = 'supadata';

  /**
   * Check if the provider is configured with required API key
   */
  isConfigured() {
    const apiKey = process.env.SUPADATA_API_KEY;
    const isConfigured = !!apiKey && apiKey.trim().length > 0;
    console.log('[Supadata] isConfigured check:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyStartsWith: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A',
      isConfigured
    });
    return isConfigured;
  }

  /**
   * Get or create a Supadata client instance
   * Creates a new instance each time to ensure proper initialization
   */
  getClient() {
    console.log('[Supadata] getClient() called');
    const apiKey = process.env.SUPADATA_API_KEY;
    
    console.log('[Supadata] API key check:', {
      exists: !!apiKey,
      type: typeof apiKey,
      length: apiKey ? apiKey.length : 0,
      firstChars: apiKey ? apiKey.substring(0, 15) + '...' : 'N/A'
    });
    
    if (!apiKey || !apiKey.trim()) {
      console.error('[Supadata] API key is missing or empty');
      throw new Error('SUPADATA_API_KEY is not configured');
    }

    const trimmedKey = apiKey.trim();
    
    // Validate API key format (basic check - should not be empty)
    if (trimmedKey.length === 0) {
      console.error('[Supadata] API key is empty after trimming');
      throw new Error('SUPADATA_API_KEY is empty');
    }

    console.log('[Supadata] Creating Supadata client instance...');
    console.log('[Supadata] Supadata constructor:', typeof Supadata);
    console.log('[Supadata] Supadata import check:', {
      Supadata: !!Supadata,
      SupadataError: !!SupadataError
    });

    try {
      // Create a fresh client instance to ensure proper initialization
      console.log('[Supadata] Calling new Supadata({ apiKey: "..." })');
      const client = new Supadata({
        apiKey: trimmedKey
      });
      
      console.log('[Supadata] Client created:', {
        clientExists: !!client,
        clientType: typeof client,
        clientKeys: client ? Object.keys(client) : [],
        hasYoutube: client ? !!client.youtube : false,
        hasTranscript: client ? !!client.transcript : false
      });
      
      // Verify client was created successfully
      if (!client) {
        console.error('[Supadata] Client is null/undefined after creation');
        throw new Error('Failed to create Supadata client instance');
      }
      
      // Check if client has required methods
      if (!client.youtube) {
        console.error('[Supadata] Client missing youtube property');
        console.log('[Supadata] Available client properties:', Object.keys(client));
      } else {
        console.log('[Supadata] Client.youtube exists:', {
          type: typeof client.youtube,
          keys: Object.keys(client.youtube || {})
        });
      }
      
      console.log('[Supadata] Client initialization successful');
      return client;
    } catch (err) {
      console.error('[Supadata] Client initialization error:', err);
      console.error('[Supadata] Error stack:', err.stack);
      throw new Error(`Failed to initialize Supadata client: ${err.message}`);
    }
  }

  /**
   * Fetch transcript for a YouTube video
   * @param {string} videoId - YouTube video ID
   * @param {Object} options - Options
   * @param {string} options.language - Language code (default: 'en')
   * @param {number} options.chunkSize - Maximum characters per transcript chunk (50-10000)
   *   Smaller values = more granular segments (more segments, shorter duration)
   *   Larger values = less granular segments (fewer segments, longer duration)
   *   Default: undefined (uses API default, typically ~1000-2000 chars)
   * @param {string} options.mode - Transcript mode: 'native' | 'auto' | 'generate' (default: 'auto')
   * @returns {Promise<{segments: Array, language: string, transcriptType: string} | {error: Object}>}
   */
  async fetchTranscript(videoId, { language = 'en', chunkSize, mode } = {}) {
    console.log('[Supadata] fetchTranscript called with videoId:', videoId, 'language:', language, 'chunkSize:', chunkSize, 'mode:', mode);

    if (!this.isConfigured()) {
      console.error('[Supadata] API key not configured');
      return {
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Transcript service unavailable. Please configure SUPADATA_API_KEY.'
        }
      };
    }

    // Get a fresh client instance
    let client;
    try {
      console.log('[Supadata] Attempting to get client instance...');
      client = this.getClient();
      console.log('[Supadata] Client obtained successfully');
    } catch (err) {
      console.error('[Supadata] Failed to initialize client:', err);
      console.error('[Supadata] Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      return {
        error: {
          code: 'INITIALIZATION_ERROR',
          message: 'Failed to initialize Supadata client. Please check your API key configuration.'
        }
      };
    }

    try {
      // Construct YouTube URL from videoId
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log('[Supadata] Fetching transcript via SDK for:', videoUrl);
      console.log('[Supadata] Client state before API call:', {
        clientExists: !!client,
        hasYoutube: !!client?.youtube,
        hasTranscript: !!client?.transcript,
        youtubeType: typeof client?.youtube,
        transcriptType: typeof client?.transcript
      });

      // Verify client.youtube exists before calling
      if (!client || !client.youtube) {
        console.error('[Supadata] Client or client.youtube is missing before API call');
        console.log('[Supadata] Client object:', client);
        return {
          error: {
            code: 'INITIALIZATION_ERROR',
            message: 'Supadata client is not properly initialized. Missing youtube property.'
          }
        };
      }

      if (!client.youtube.transcript) {
        console.error('[Supadata] client.youtube.transcript method is missing');
        console.log('[Supadata] Available methods on client.youtube:', Object.keys(client.youtube || {}));
        return {
          error: {
            code: 'INITIALIZATION_ERROR',
            message: 'Supadata client is not properly initialized. Missing transcript method.'
          }
        };
      }

      console.log('[Supadata] Calling client.youtube.transcript()...');
      
      // Use 'auto' mode by default: tries native captions first, falls back to AI-generated for better granularity
      // Options: 'native' (fastest, less granular), 'auto' (balanced), 'generate' (most granular, costs more)
      const transcriptMode = mode || process.env.SUPADATA_TRANSCRIPT_MODE || 'auto';
      
      // Validate chunkSize if provided
      let validChunkSize = undefined;
      if (chunkSize !== undefined && chunkSize !== null) {
        const parsedChunkSize = typeof chunkSize === 'number' ? chunkSize : parseInt(chunkSize, 10);
        if (!isNaN(parsedChunkSize) && parsedChunkSize >= 50 && parsedChunkSize <= 10000) {
          validChunkSize = parsedChunkSize;
        } else {
          console.warn('[Supadata] Invalid chunkSize, must be between 50 and 10000. Using default.');
        }
      }
      
      const callParams = {
        url: videoUrl,
        lang: language,
        mode: transcriptMode,
        ...(validChunkSize !== undefined && { chunkSize: validChunkSize })
      };
      
      console.log('[Supadata] Call parameters:', callParams);

      // Use the official SDK - can return transcript directly or a jobId
      const transcriptResult = await client.youtube.transcript(callParams);

      console.log('[Supadata] API call completed, result type:', typeof transcriptResult);
      console.log('[Supadata] Result keys:', transcriptResult ? Object.keys(transcriptResult) : 'null/undefined');

      // Check if we got a job ID (async processing for large files)
      if (transcriptResult && typeof transcriptResult === 'object' && 'jobId' in transcriptResult) {
        console.log('[Supadata] Received jobId, polling for results:', transcriptResult.jobId);
        
        // Poll for job status (with timeout)
        const maxAttempts = 30; // 30 attempts = 60 seconds max
        const pollInterval = 2000; // 2 seconds
        let attempts = 0;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          console.log(`[Supadata] Polling job status, attempt ${attempts + 1}/${maxAttempts}`);
          console.log('[Supadata] Checking client.transcript.getJobStatus:', {
            hasTranscript: !!client.transcript,
            hasGetJobStatus: !!client.transcript?.getJobStatus
          });
          
          const jobResult = await client.transcript.getJobStatus(transcriptResult.jobId);
          
          console.log('[Supadata] Job status result:', {
            status: jobResult?.status,
            hasContent: !!jobResult?.content,
            keys: jobResult ? Object.keys(jobResult) : []
          });
          
          if (jobResult.status === 'completed') {
            console.log('[Supadata] Job completed, processing transcript');
            // When job completes, transcript is in jobResult.content
            const transcriptData = jobResult.content || jobResult;
            const segments = this.parseSegments(transcriptData);
            return this.formatResponse(segments, language);
          } else if (jobResult.status === 'failed') {
            console.error('[Supadata] Job failed:', jobResult.error);
            return {
              error: {
                code: 'JOB_FAILED',
                message: jobResult.error || 'Transcript job failed'
              }
            };
          }
          
          attempts++;
          console.log(`[Supadata] Job status: ${jobResult.status}, attempt ${attempts}/${maxAttempts}`);
        }

        // Timeout waiting for job
        return {
          error: {
            code: 'TIMEOUT',
            message: 'Transcript job is taking longer than expected. Please try again later.'
          }
        };
      } else {
        // Got transcript directly
        console.log('[Supadata] Received transcript directly (not a job)');
        console.log('[Supadata] Transcript result structure:', {
          isArray: Array.isArray(transcriptResult),
          hasContent: !!(transcriptResult && transcriptResult.content),
          keys: transcriptResult ? Object.keys(transcriptResult) : [],
          type: typeof transcriptResult
        });
        const segments = this.parseSegments(transcriptResult);
        console.log('[Supadata] Parsed segments count:', segments.length);
        return this.formatResponse(segments, language);
      }

    } catch (err) {
      console.error('[Supadata] Error:', err);
      console.error('[Supadata] Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });

      // Handle "client not fully initialized" error specifically
      if (err.message && err.message.includes('client not fully initialized')) {
        console.error('[Supadata] Client initialization issue detected');
        return {
          error: {
            code: 'INITIALIZATION_ERROR',
            message: 'Supadata client initialization failed. Please verify your SUPADATA_API_KEY is correctly set in your environment variables.',
            details: 'Make sure SUPADATA_API_KEY is set in your .env.local file and restart your development server.'
          }
        };
      }

      // Handle SupadataError from SDK
      if (err instanceof SupadataError) {
        return {
          error: {
            code: err.error || 'API_ERROR',
            message: err.message || 'An error occurred while fetching the transcript',
            details: err.details
          }
        };
      }

      // Handle other errors
      return {
        error: {
          code: 'UNKNOWN_ERROR',
          message: err.message || 'An unexpected error occurred'
        }
      };
    }
  }

  /**
   * Format the response in the expected format
   */
  formatResponse(segments, language) {
    if (!segments || segments.length === 0) {
      return {
        error: {
          code: 'NO_TRANSCRIPT',
          message: 'No transcript available for this video'
        }
      };
    }

    console.log('[Supadata] Success! Parsed segments:', segments.length);

    return {
      segments,
      language,
      transcriptType: 'auto_generated',
      provider: this.name
    };
  }

  /**
   * Parse Supadata response into normalized segments
   * Adjust this based on actual API response format
   */
  parseSegments(data) {
    console.log('[Supadata] parseSegments called with:', {
      dataType: typeof data,
      isArray: Array.isArray(data),
      isNull: data === null,
      isUndefined: data === undefined,
      keys: data && typeof data === 'object' ? Object.keys(data) : []
    });

    // Common API response formats to handle:
    
    // Format 1: Array of segments directly
    if (Array.isArray(data)) {
      console.log('[Supadata] Parsing as direct array, length:', data.length);
      return this.normalizeSegments(data);
    }

    // Format 2: Wrapped in a content field (actual Supadata API format)
    if (data && data.content && Array.isArray(data.content)) {
      console.log('[Supadata] Parsing from data.content array, length:', data.content.length);
      return this.normalizeSegments(data.content);
    }

    // Format 3: Wrapped in a data/transcript field
    if (data.data && Array.isArray(data.data)) {
      return this.normalizeSegments(data.data);
    }

    if (data.transcript && Array.isArray(data.transcript)) {
      return this.normalizeSegments(data.transcript);
    }

    // Format 4: Segments in a segments field
    if (data.segments && Array.isArray(data.segments)) {
      return this.normalizeSegments(data.segments);
    }

    console.log('[Supadata] Unknown response format:', Object.keys(data));
    return [];
  }

  /**
   * Normalize segments to our standard format
   */
  normalizeSegments(segments) {
    console.log('[Supadata] normalizeSegments called with', segments.length, 'segments');
    
    if (segments.length > 0) {
      console.log('[Supadata] First segment sample:', {
        keys: Object.keys(segments[0]),
        offset: segments[0].offset,
        duration: segments[0].duration,
        textLength: segments[0].text?.length || 0,
        textPreview: segments[0].text?.substring(0, 100) || 'N/A'
      });
      
      // Log duration statistics
      const durations = segments
        .map(s => s.duration || s.dur || 0)
        .filter(d => d > 0);
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        console.log('[Supadata] Segment duration stats:', {
          count: durations.length,
          avgMs: Math.round(avgDuration),
          avgSeconds: (avgDuration / 1000).toFixed(2),
          minMs: minDuration,
          minSeconds: (minDuration / 1000).toFixed(2),
          maxMs: maxDuration,
          maxSeconds: (maxDuration / 1000).toFixed(2)
        });
      }
    }
    
    return segments
      .map((item) => {
        // Handle various possible field names
        const text = item.text || item.content || item.transcript || '';
        const startMs = item.startMs || item.start_ms || item.offset || item.start || 0;
        const duration = item.duration || item.dur || 0;
        const endMs = item.endMs || item.end_ms || (startMs + duration);

        if (!text || !text.trim()) {
          return null;
        }

        return {
          startTime: msToTimestamp(parseInt(startMs, 10)),
          endTime: msToTimestamp(parseInt(endMs, 10)),
          startMs: parseInt(startMs, 10),
          endMs: parseInt(endMs, 10),
          text: text.trim()
        };
      })
      .filter(Boolean);
  }
}

