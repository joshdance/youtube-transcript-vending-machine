/**
 * Supadata YouTube Transcript Provider
 * 
 * Uses the Supadata API for YouTube transcript extraction.
 * 
 * Website: https://supadata.ai/youtube-transcript-api
 * - 100 free requests without credit card
 * - Accurate, time-stamped transcripts
 */

import { msToTimestamp } from './utils.js';

export class SupadataProvider {
  name = 'supadata';

  /**
   * Check if the provider is configured with required API key
   */
  isConfigured() {
    return !!process.env.SUPADATA_API_KEY;
  }

  /**
   * Fetch transcript for a YouTube video
   * @param {string} videoId - YouTube video ID
   * @param {Object} options - Options
   * @param {string} options.language - Language code (default: 'en')
   * @returns {Promise<{segments: Array, language: string, transcriptType: string} | {error: Object}>}
   */
  async fetchTranscript(videoId, { language = 'en' } = {}) {
    console.log('[Supadata] fetchTranscript called with videoId:', videoId, 'language:', language);

    if (!this.isConfigured()) {
      console.error('[Supadata] API key not configured');
      return {
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Transcript service unavailable. Please configure SUPADATA_API_KEY.'
        }
      };
    }

    const apiKey = process.env.SUPADATA_API_KEY;

    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Supadata API endpoint (based on typical REST API patterns)
      // Note: This may need adjustment based on their actual API documentation
      const apiUrl = `https://api.supadata.ai/v1/youtube/transcript`;
      
      console.log('[Supadata] Making request to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          video_id: videoId,
          language: language
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[Supadata] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Supadata] API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }

        return { error: this.mapError(response.status, errorData) };
      }

      const data = await response.json();
      console.log('[Supadata] Response received, keys:', Object.keys(data));

      // Parse the response - format may vary, adjust based on actual API response
      const segments = this.parseSegments(data);
      console.log('[Supadata] Parsed segments:', segments.length);

      if (!segments || segments.length === 0) {
        return {
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for this video'
          }
        };
      }

      console.log('[Supadata] Success! First segment:', segments[0]);

      return {
        segments,
        language,
        transcriptType: 'auto_generated',
        provider: this.name
      };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        console.error('[Supadata] Request timed out');
        return {
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out. Please try again.'
          }
        };
      }

      console.error('[Supadata] Fetch error:', err);
      throw err;
    }
  }

  /**
   * Parse Supadata response into normalized segments
   * Adjust this based on actual API response format
   */
  parseSegments(data) {
    // Common API response formats to handle:
    
    // Format 1: Array of segments directly
    if (Array.isArray(data)) {
      return this.normalizeSegments(data);
    }

    // Format 2: Wrapped in a data/transcript field
    if (data.data && Array.isArray(data.data)) {
      return this.normalizeSegments(data.data);
    }

    if (data.transcript && Array.isArray(data.transcript)) {
      return this.normalizeSegments(data.transcript);
    }

    // Format 3: Segments in a segments field
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

  /**
   * Map HTTP status codes to user-friendly errors
   */
  mapError(status, errorData) {
    const errorMap = {
      400: { 
        code: 'BAD_REQUEST', 
        message: errorData.message || 'Invalid request. Please check the video ID.' 
      },
      401: { 
        code: 'AUTH_FAILED', 
        message: 'Invalid API key. Please check your SUPADATA_API_KEY.' 
      },
      403: { 
        code: 'FORBIDDEN', 
        message: 'Access denied. Please check your API key permissions.' 
      },
      404: { 
        code: 'NO_TRANSCRIPT', 
        message: errorData.message || 'No transcript available for this video' 
      },
      429: { 
        code: 'RATE_LIMITED', 
        message: 'Rate limit exceeded. Please try again later.' 
      },
      500: { 
        code: 'SERVER_ERROR', 
        message: 'Supadata service temporarily unavailable. Please try again.' 
      },
      503: { 
        code: 'SERVICE_UNAVAILABLE', 
        message: 'Service temporarily unavailable. Please try again.' 
      }
    };

    return errorMap[status] || { 
      code: 'UNKNOWN', 
      message: errorData.message || 'An unexpected error occurred.' 
    };
  }
}

