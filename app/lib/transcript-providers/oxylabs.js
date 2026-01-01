/**
 * Oxylabs transcript provider
 * Uses the Realtime API for synchronous transcript fetching
 */

import { msToTimestamp } from './utils';

export class OxylabsProvider {
  name = 'oxylabs';

  /**
   * Check if the provider is configured with required credentials
   */
  isConfigured() {
    const hasUsername = !!process.env.OXYLABS_USERNAME;
    const hasPassword = !!process.env.OXYLABS_PASSWORD;
    console.log('[Oxylabs] Config check - username:', hasUsername, 'password:', hasPassword);
    return hasUsername && hasPassword;
  }

  /**
   * Fetch transcript for a YouTube video
   * Tries auto_generated first, then falls back to manual captions
   */
  async fetchTranscript(videoId, { language = 'en' } = {}) {
    console.log('[Oxylabs] fetchTranscript called with videoId:', videoId, 'language:', language);
    
    if (!this.isConfigured()) {
      console.error('[Oxylabs] Credentials not configured');
      return { 
        error: { 
          code: 'NOT_CONFIGURED', 
          message: 'Transcript service unavailable' 
        } 
      };
    }

    // Try auto-generated first
    console.log('[Oxylabs] Trying auto_generated captions...');
    let result = await this._fetchWithOrigin(videoId, language, 'auto_generated');
    
    if (result.segments && result.segments.length > 0) {
      return { ...result, transcriptType: 'auto_generated' };
    }

    // Fallback to uploader-provided captions (manual captions)
    console.log('[Oxylabs] Auto-generated empty, trying uploader_provided captions...');
    result = await this._fetchWithOrigin(videoId, language, 'uploader_provided');
    
    if (result.segments && result.segments.length > 0) {
      return { ...result, transcriptType: 'uploader_provided' };
    }

    // Try without specifying origin (let Oxylabs decide)
    console.log('[Oxylabs] uploader_provided empty, trying without transcript_origin...');
    result = await this._fetchWithOrigin(videoId, language, null);
    
    if (result.segments && result.segments.length > 0) {
      return { ...result, transcriptType: 'auto' };
    }

    // All attempts failed
    console.log('[Oxylabs] Both auto_generated and manual returned no content');
    return { 
      error: { 
        code: 'NO_TRANSCRIPT', 
        message: 'No transcript available for this video' 
      } 
    };
  }

  /**
   * Internal method to fetch transcript with a specific origin type
   */
  async _fetchWithOrigin(videoId, language, transcriptOrigin) {
    const auth = Buffer.from(
      `${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`
    ).toString('base64');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Build context array
    const context = [
      { key: 'language_code', value: language }
    ];
    
    // Only add transcript_origin if specified
    if (transcriptOrigin) {
      context.push({ key: 'transcript_origin', value: transcriptOrigin });
    }
    
    const requestBody = {
      source: 'youtube_transcript',
      query: videoId,
      context
    };
    
    console.log('[Oxylabs] Request for', transcriptOrigin, ':', JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('[Oxylabs] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Oxylabs] API error response:', errorText);
        return { error: this.mapError(response.status) };
      }

      const data = await response.json();
      
      // Log full result for debugging
      if (data.results?.[0]) {
        const result = data.results[0];
        console.log('[Oxylabs] Result status_code:', result.status_code);
        console.log('[Oxylabs] Result url:', result.url);
        console.log('[Oxylabs] Content type:', typeof result.content);
        
        // Check for job failure status codes (612, 613)
        if (result.status_code === 612 || result.status_code === 613) {
          console.log('[Oxylabs] Job failed with status_code:', result.status_code);
          return { segments: [], language };
        }
        
        // If content is a string, check if it needs parsing
        let content = result.content;
        
        if (typeof content === 'string') {
          console.log('[Oxylabs] Content string length:', content.length);
          
          if (content.length === 0) {
            console.log('[Oxylabs] Content is empty string');
            return { segments: [], language };
          }
          
          // Log first part of content
          console.log('[Oxylabs] Content preview:', content.substring(0, 300));
          
          // Try to parse as JSON
          try {
            content = JSON.parse(content);
            console.log('[Oxylabs] Parsed as JSON, isArray:', Array.isArray(content), 'length:', content.length);
            data.results[0].content = content;
          } catch (e) {
            console.log('[Oxylabs] Not valid JSON, treating as raw string');
          }
        }
        
        if (Array.isArray(content)) {
          console.log('[Oxylabs] Content array length:', content.length);
          if (content.length > 0) {
            console.log('[Oxylabs] First item keys:', Object.keys(content[0]));
          }
        }
      }
      
      const segments = this.parseSegments(data);
      console.log('[Oxylabs] Parsed segments:', segments.length);

      if (segments.length > 0) {
        console.log('[Oxylabs] First segment:', segments[0]);
      }

      return { 
        segments, 
        language, 
        provider: this.name
      };

    } catch (err) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        console.error('[Oxylabs] Request timed out');
        return { 
          error: { 
            code: 'TIMEOUT', 
            message: 'Request timed out. Please try again.' 
          } 
        };
      }
      
      console.error('[Oxylabs] Fetch error:', err);
      throw err;
    }
  }

  /**
   * Parse Oxylabs response into normalized segments
   */
  parseSegments(data) {
    const content = data?.results?.[0]?.content;
    if (!content || !Array.isArray(content)) return [];

    return content
      .filter(entry => entry.transcriptSegmentRenderer)
      .map(entry => {
        const segment = entry.transcriptSegmentRenderer;
        
        // Join all text runs and clean up
        const text = segment.snippet?.runs
          ?.map(run => run.text)
          .join('')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!text) return null;

        const startMs = parseInt(segment.startMs, 10);
        const endMs = parseInt(segment.endMs, 10);

        return {
          startTime: msToTimestamp(startMs),
          endTime: msToTimestamp(endMs),
          startMs,
          endMs,
          text
        };
      })
      .filter(Boolean);
  }

  /**
   * Map HTTP status codes to user-friendly errors
   */
  mapError(status) {
    const errorMap = {
      400: { code: 'BAD_REQUEST', message: 'Invalid video URL. Please check and try again.' },
      401: { code: 'AUTH_FAILED', message: 'Transcript service unavailable' },
      403: { code: 'FORBIDDEN', message: 'Transcript service unavailable' },
      404: { code: 'NOT_FOUND', message: 'No transcript available for this video' },
      422: { code: 'INVALID_PAYLOAD', message: 'Something went wrong. Please try again.' },
      429: { code: 'RATE_LIMITED', message: 'Service is busy. Please try again in a moment.' },
      500: { code: 'SERVER_ERROR', message: 'Transcript service temporarily unavailable.' },
      524: { code: 'TIMEOUT', message: 'Request timed out. Please try again.' }
    };

    return errorMap[status] || { code: 'UNKNOWN', message: 'An unexpected error occurred.' };
  }
}
