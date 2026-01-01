import { debugLog } from './debug';

let storageAttempted = false;

/**
 * Stores a transcript in the database
 * @param {string} youtubeUrl - The YouTube video URL
 * @param {Array} transcriptData - The transcript segments array
 * @param {Object} session - The user's session object
 * @returns {Promise<Object>} - The response from the server
 */
export async function storeTranscript(youtubeUrl, transcriptData, session) {
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
        transcriptData
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
 * Downloads transcript in specified format
 * @param {Array} segments - The transcript segments
 * @param {string} format - 'vtt' | 'srt' | 'txt'
 * @param {string} filename - Base filename (without extension)
 */
export function downloadTranscript(segments, format = 'vtt', filename = 'transcript') {
  if (!segments || !Array.isArray(segments)) {
    throw new Error('No transcript data available');
  }

  let content, mimeType, extension;

  switch (format) {
    case 'srt':
      content = toSRT(segments);
      mimeType = 'text/srt';
      extension = 'srt';
      break;
    case 'txt':
      content = toTXT(segments);
      mimeType = 'text/plain';
      extension = 'txt';
      break;
    case 'vtt':
    default:
      content = toVTT(segments);
      mimeType = 'text/vtt';
      extension = 'vtt';
      break;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert segments to VTT format
 */
function toVTT(segments) {
  let vtt = 'WEBVTT\n\n';
  segments.forEach((cue, i) => {
    vtt += `${i + 1}\n`;
    vtt += `${formatVTTTime(cue.startMs)} --> ${formatVTTTime(cue.endMs)}\n`;
    vtt += `${cue.text}\n\n`;
  });
  return vtt;
}

/**
 * Convert segments to SRT format
 */
function toSRT(segments) {
  let srt = '';
  segments.forEach((cue, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatSRTTime(cue.startMs)} --> ${formatSRTTime(cue.endMs)}\n`;
    srt += `${cue.text}\n\n`;
  });
  return srt;
}

/**
 * Convert segments to plain text
 */
function toTXT(segments) {
  return segments.map(cue => cue.text).join('\n');
}

/**
 * Format milliseconds to VTT time (HH:MM:SS.mmm)
 */
function formatVTTTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Format milliseconds to SRT time (HH:MM:SS,mmm)
 */
function formatSRTTime(ms) {
  return formatVTTTime(ms).replace('.', ',');
}

// Legacy function - kept for backward compatibility but deprecated
export async function downloadRawTranscript(transcriptUrl) {
  console.warn('downloadRawTranscript is deprecated. Use downloadTranscript instead.');
  
  if (!transcriptUrl) return;
  
  try {
    const response = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(transcriptUrl));
    const data = await response.json();
    
    if (!response.ok || !data.rawContent) {
      throw new Error("Failed to fetch transcript content");
    }
    
    const blob = new Blob([data.rawContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.vtt';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error downloading transcript:", err);
    throw new Error("Failed to download transcript: " + err.message);
  }
}
