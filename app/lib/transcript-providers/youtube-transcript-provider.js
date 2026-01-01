/**
 * YouTube Transcript Provider (npm package)
 * 
 * Uses the youtube-transcript-api npm package which scrapes YouTube transcripts
 * via youtube-transcript.io service.
 * 
 * Package: https://www.npmjs.com/package/youtube-transcript-api
 * GitHub: https://github.com/0x6a69616e/youtube-transcript-api
 */

import TranscriptClient from 'youtube-transcript-api';
import { msToTimestamp } from './utils.js';

// Create a new client for each request (the package has initialization issues with reuse)
async function getClient() {
  console.log('[YoutubeTranscript] Creating new client instance...');
  const client = new TranscriptClient();
  await client.ready;
  console.log('[YoutubeTranscript] Client initialized and ready');
  return client;
}

export class YoutubeTranscriptProvider {
  name = 'youtube-transcript';

  /**
   * Check if the provider is configured
   * This provider doesn't require any configuration
   */
  isConfigured() {
    return true; // Always available, no API keys needed
  }

  /**
   * Fetch transcript for a YouTube video
   * @param {string} videoId - YouTube video ID
   * @param {Object} options - Options
   * @param {string} options.language - Language code (default: 'en')
   * @returns {Promise<{segments: Array, language: string, transcriptType: string} | {error: Object}>}
   */
  async fetchTranscript(videoId, { language = 'en' } = {}) {
    console.log('[YoutubeTranscript] fetchTranscript called with videoId:', videoId, 'language:', language);

    try {
      // Get the client instance (wait for it to be ready)
      const client = await getClient();
      
      console.log('[YoutubeTranscript] Client ready, fetching transcript...');
      
      // Fetch transcript - language can be specified in config
      const rawTranscript = await client.getTranscript(videoId, {
        lang: language
      });

      console.log('[YoutubeTranscript] Raw transcript received:', rawTranscript?.length || 0, 'items');
      console.log('[YoutubeTranscript] Transcript type:', typeof rawTranscript, 'isArray:', Array.isArray(rawTranscript));

      if (!rawTranscript || !Array.isArray(rawTranscript) || rawTranscript.length === 0) {
        console.log('[YoutubeTranscript] Empty transcript returned');
        return {
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for this video'
          }
        };
      }

      // Convert to our standard format
      // The package returns: [{ text: string, offset: number, duration: number }]
      const segments = rawTranscript.map((item) => {
        const startMs = item.offset || 0;
        const duration = item.duration || 0;
        const endMs = startMs + duration;

        return {
          startTime: msToTimestamp(startMs),
          endTime: msToTimestamp(endMs),
          startMs,
          endMs,
          text: (item.text || '').trim()
        };
      }).filter(segment => segment.text.length > 0); // Filter out empty segments

      console.log('[YoutubeTranscript] Processed segments:', segments.length);
      
      if (segments.length === 0) {
        return {
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for this video'
          }
        };
      }

      console.log('[YoutubeTranscript] Success! First segment:', segments[0]);

      return {
        segments,
        language,
        transcriptType: 'auto_generated',
        provider: this.name
      };

    } catch (error) {
      console.error('[YoutubeTranscript] Error fetching transcript:', error);
      console.error('[YoutubeTranscript] Error type:', error.constructor.name);
      console.error('[YoutubeTranscript] Error message:', error.message);

      // Map errors to user-friendly messages
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('not available') || errorMessage.includes('not found')) {
        return {
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for this video'
          }
        };
      }

      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again shortly.'
          }
        };
      }

      if (errorMessage.includes('unavailable') || errorMessage.includes('does not exist')) {
        return {
          error: {
            code: 'VIDEO_UNAVAILABLE',
            message: 'Video is unavailable or does not exist'
          }
        };
      }

      // Generic error
      return {
        error: {
          code: 'PROVIDER_ERROR',
          message: error.message || 'Failed to fetch transcript'
        }
      };
    }
  }
}
