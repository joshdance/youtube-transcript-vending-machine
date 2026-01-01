/**
 * Test script for youtube-transcript provider
 * 
 * Usage: node test-youtube-transcript.js [VIDEO_ID]
 */

import { YoutubeTranscriptProvider } from './app/lib/transcript-providers/youtube-transcript-provider.js';

const videoId = process.argv[2] || 'dQw4w9WgXcQ'; // Default to Rick Astley

console.log('='.repeat(60));
console.log('YOUTUBE-TRANSCRIPT PROVIDER TEST');
console.log('='.repeat(60));
console.log('Video ID:', videoId);
console.log('='.repeat(60));

const provider = new YoutubeTranscriptProvider();

console.log('\nProvider:', provider.name);
console.log('Configured:', provider.isConfigured());
console.log('\nFetching transcript...\n');

try {
  const startTime = Date.now();
  const result = await provider.fetchTranscript(videoId, { language: 'en' });
  const elapsed = Date.now() - startTime;

  console.log(`\nResponse time: ${elapsed}ms`);

  if (result.error) {
    console.log('\n❌ ERROR:');
    console.log('Code:', result.error.code);
    console.log('Message:', result.error.message);
  } else {
    console.log('\n✅ SUCCESS!');
    console.log('Segments:', result.segments.length);
    console.log('Language:', result.language);
    console.log('Transcript Type:', result.transcriptType);
    console.log('Provider:', result.provider);
    
    if (result.segments.length > 0) {
      console.log('\nFirst 3 segments:');
      result.segments.slice(0, 3).forEach((seg, i) => {
        console.log(`\n${i + 1}. [${seg.startTime} → ${seg.endTime}]`);
        console.log('   Text:', seg.text.substring(0, 100) + (seg.text.length > 100 ? '...' : ''));
      });
      
      console.log('\nLast segment:');
      const last = result.segments[result.segments.length - 1];
      console.log(`[${last.startTime} → ${last.endTime}]`);
      console.log('Text:', last.text.substring(0, 100) + (last.text.length > 100 ? '...' : ''));
    }
  }
} catch (error) {
  console.error('\n❌ EXCEPTION:', error.message);
  console.error(error.stack);
}

