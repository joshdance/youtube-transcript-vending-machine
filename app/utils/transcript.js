import { debugLog } from './debug';

let storageAttempted = false;

/**
 * Stores a transcript in the database
 * @param {string} youtubeUrl - The YouTube video URL
 * @param {string} transcriptUrl - The URL of the transcript
 * @param {Object} session - The user's session object
 * @returns {Promise<Object>} - The response from the server
 */
export async function storeTranscript(youtubeUrl, transcriptUrl, session) {
  // Only attempt storage once per session
  if (storageAttempted) {
    debugLog('Storage already attempted this session, skipping');
    return null;
  }

  if (!session?.access_token) {
    debugLog('No valid session found, skipping transcript storage');
    storageAttempted = true;
    return null;
  }

  try {
    storageAttempted = true;
    const response = await fetch('/api/store-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        youtubeUrl,
        transcriptUrl
      })
    });

    const data = await response.json();
    if (!response.ok) {
      debugLog('Failed to store transcript:', data.error);
      return null;
    }
    
    debugLog('Successfully stored transcript');
    return data;
  } catch (error) {
    debugLog('Error storing transcript:', error);
    return null;
  }
}

/**
 * Downloads a raw transcript file
 * @param {string} transcriptUrl - The URL of the transcript to download
 */
export async function downloadRawTranscript(transcriptUrl) {
  if (!transcriptUrl) return;
  
  try {
    // Fetch the VTT content
    const response = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(transcriptUrl));
    const data = await response.json();
    
    if (!response.ok || !data.rawContent) {
      throw new Error("Failed to fetch transcript content");
    }
    
    // Create a blob from the raw content
    const blob = new Blob([data.rawContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.vtt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error downloading transcript:", err);
    throw new Error("Failed to download transcript: " + err.message);
  }
} 