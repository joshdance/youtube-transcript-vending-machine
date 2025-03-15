// AI Summary Prompt Configuration
// This file contains the prompt template for generating AI summaries of YouTube transcripts

const DEFAULT_PROMPT = `Take this YouTube Transcript and create a detailed summary. Include any surprising or unusual findings. Don't leave out anything critical`;

/**
 * Generate a prompt for the AI based on the transcript and optional custom prompt
 * @param {Array|Object} transcript - The transcript data to summarize
 * @param {string} customPrompt - Optional custom prompt to override the default
 * @returns {string} The complete prompt to send to the AI model
 */
export function generateAiSummaryPrompt(transcript, customPrompt = DEFAULT_PROMPT) {
  let promptText = customPrompt.trim();
  
  // Convert transcript to a readable format to send to the AI
  let transcriptText;
  
  if (Array.isArray(transcript)) {
    // Format array of transcript entries with timestamps
    transcriptText = transcript.map(entry => {
      return `[${formatTimestamp(entry.start)} - ${formatTimestamp(entry.end)}] ${entry.text}`;
    }).join('\n\n');
  } else if (typeof transcript === 'object') {
    // Handle object format if different from array
    transcriptText = JSON.stringify(transcript, null, 2);
  } else {
    // Fallback for string or other formats
    transcriptText = String(transcript);
  }
  
  return `${promptText}\n\n${transcriptText}`;
}

/**
 * Format seconds into a readable timestamp (MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(seconds) {
  if (typeof seconds !== 'number') return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default DEFAULT_PROMPT; 