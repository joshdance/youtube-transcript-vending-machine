"use client";

import { isValidYouTubeUrl } from './youtube';
import { storeTranscript } from './transcript';
import { debugLog } from './debug';

/**
 * Fetches and processes a transcript for a YouTube video
 * @param {Object} params - The parameters for fetching the transcript
 * @param {string} params.targetUrl - The YouTube video URL
 * @param {string} params.url - The current URL in the input field
 * @param {Object} params.session - The user's session object
 * @param {string} [params.language='en'] - Language code for the transcript
 * @param {number} [params.chunkSize] - Maximum characters per chunk (50-10000). Smaller = more granular segments
 * @param {string} [params.mode] - Transcript mode: 'native' | 'auto' | 'generate'
 * @param {Object} params.states - State management object
 * @param {Function} params.states.setError - Function to set error state
 * @param {Function} params.states.setTranscript - Function to set transcript state
 * @param {Function} params.states.setTranscriptUrl - Function to set transcript URL state (kept for compatibility)
 * @param {Function} params.states.setTranscriptType - Function to set transcript type state
 * @param {Function} params.states.setLoadingStates - Function to set loading states
 */
export async function fetchTranscript({
  targetUrl,
  url,
  session,
  language,
  chunkSize,
  mode,
  states: {
    setError,
    setTranscript,
    setTranscriptUrl,
    setTranscriptType,
    setLoadingStates,
  }
}) {
  const validation = isValidYouTubeUrl(targetUrl);
  const videoId = validation.videoId;

  if (!targetUrl) {
    setError("Please enter a YouTube URL");
    return;
  }

  if (!validation.isValid) {
    setError(validation.message || "Invalid YouTube URL");
    return;
  }

  // Update loading state for this specific video
  setLoadingStates(prev => ({ ...prev, [videoId]: true }));
  setError(null);
  setTranscript(null);
  setTranscriptUrl(null);
  setTranscriptType(null);

  try {
    debugLog("Fetching transcript for URL:", targetUrl);
    debugLog("Transcript options:", { language, chunkSize, mode });
    
    const response = await fetch("/api/transcripts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        url: targetUrl,
        ...(language && { language }),
        ...(chunkSize !== undefined && chunkSize !== null && { chunkSize }),
        ...(mode && { mode })
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch transcript");
    }

    debugLog("Transcript received:", data.segments?.length, "segments");

    // Set the transcript segments
    if (data.segments && Array.isArray(data.segments)) {
      setTranscript(data.segments);
      setTranscriptType(data.transcriptType || 'auto_generated');
      
      // Try to store the transcript (fire-and-forget)
      if (session) {
        storeTranscript(targetUrl, data.segments, session).catch(err => {
          console.error('Failed to store transcript:', err);
        });
      }
    } else {
      throw new Error("Unexpected response format - no segments found");
    }

  } catch (err) {
    console.error("Error fetching transcript:", err);
    setError(err.message || "An error occurred while fetching the transcript");
  } finally {
    // Clear loading state for this specific video
    setLoadingStates(prev => ({ ...prev, [videoId]: false }));
  }
}
