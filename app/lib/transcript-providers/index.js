/**
 * Transcript Provider Registry
 * 
 * Simple provider pattern for fetching YouTube transcripts.
 * 
 * To add a new provider:
 * 1. Create a new file (e.g., whisper.js) implementing the provider interface
 * 2. Import and register it below
 * 3. Set TRANSCRIPT_PROVIDER=your-provider in .env
 * 
 * Provider interface:
 * - name: string
 * - isConfigured(): boolean
 * - fetchTranscript(videoId, options?): Promise<{segments, language} | {error}>
 */

import { OxylabsProvider } from './oxylabs';
import { YoutubeTranscriptProvider } from './youtube-transcript-provider';
import { SupadataProvider } from './supadata-provider';

// Provider registry
const providers = {
  oxylabs: OxylabsProvider,
  'youtube-transcript': YoutubeTranscriptProvider,
  supadata: SupadataProvider,
};

/**
 * Get a transcript provider instance
 * @param {string} [providerName] - Override provider name (optional)
 * @returns {Object} Provider instance
 */
export function getProvider(providerName) {
  const name = providerName || process.env.TRANSCRIPT_PROVIDER || 'youtube-transcript';
  const Provider = providers[name];

  if (!Provider) {
    throw new Error(`Unknown transcript provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }

  return new Provider();
}

/**
 * Register a new provider
 * @param {string} name - Provider name
 * @param {Function} ProviderClass - Provider class
 */
export function registerProvider(name, ProviderClass) {
  providers[name] = ProviderClass;
}

/**
 * List available providers
 * @returns {string[]} Provider names
 */
export function listProviders() {
  return Object.keys(providers);
}

// Re-export utilities for convenience
export { msToTimestamp, vttToMs } from './utils';

