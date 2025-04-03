/**
 * Transcript Algo 1
 * 
 * This algorithm focuses on filtering out duplicate content by:
 * 1. Keeping only entries with embedded timestamps
 * 2. For each entry, removing text portions that don't have <c> elements
 * 3. Preserving the first word before a timestamp when it's connected to <c> elements
 * 4. Cleaning the final text by removing all timestamp markers and <c> tags
 */

/**
 * Decodes HTML entities in text
 * @param {string} text - The text containing HTML entities
 * @returns {string} - The text with decoded HTML entities
 */
function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Safely processes HTML tags in text, only allowing specific styling tags
 * @param {string} text - The text containing HTML tags
 * @returns {string} - The text with safe HTML tags
 */
function processStylingTags(text) {
  if (!text) return '';
  
  // List of allowed HTML tags
  const allowedTags = ['b', 'i', 'u', 'em', 'strong'];
  
  // First decode HTML entities
  let processedText = decodeHTMLEntities(text);
  
  // Remove any tags that aren't in our allowed list
  processedText = processedText.replace(/<\/?([a-z][a-z0-9]*)/gi, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });
  
  return processedText;
}

/**
 * Cleans the text by removing all timestamp markers and <c> tags
 * @param {string} text - The text to clean
 * @param {boolean} preserveStyling - Whether to preserve styling tags
 * @returns {string} - The cleaned text
 */
function cleanText(text, preserveStyling = false) {
  if (!text) return '';
  
  // Always remove timestamp markers and <c> tags regardless of preserveStyling
  let cleaned = text
    .replace(/<\d\d:\d\d:\d\d\.\d+>/g, '') // Remove timestamp markers like <00:00:00.000>
    .replace(/<\/?c>/g, '')                // Remove <c> and </c> tags
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();

  // Only remove styling tags if preserveStyling is false
  if (!preserveStyling) {
    cleaned = cleaned.replace(/<\/?[a-z][a-z0-9]*>/gi, ''); // Remove all HTML tags
  }
  
  return cleaned;
}

/**
 * Process transcript using Algorithm 1
 * @param {Array} transcript - The transcript array with objects containing startTime, endTime, and text
 * @returns {Array} - The processed transcript
 */
function processTranscriptAlgo1(transcript) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return transcript;
  }

  console.log('Processing transcript:', transcript.length, 'entries');
  
  // First, filter out entries that don't have embedded timestamps
  const timestampedEntries = transcript.filter(entry => {
    // If entry has no text, skip it
    if (!entry.text || entry.text.trim() === '') {
      return false;
    }

    // Check if the text contains embedded timestamps like <00:00:00.199>
    const hasEmbeddedTimestamps = /<\d\d:\d\d:\d\d\.\d+>/.test(entry.text);
    
    // Keep entries that have embedded timestamps (indicating actual content)
    return hasEmbeddedTimestamps;
  });
  
  // Process each entry to extract only parts with <c> elements
  const processedTranscript = timestampedEntries.map(entry => {
    // Create a modified entry
    const modifiedEntry = { ...entry };
    let currentText = modifiedEntry.text;
    
    // Check for <c> elements to ensure we should process this entry
    if (!currentText.includes('<c>')) {
      return { ...modifiedEntry, text: '' };
    }
    
    // First, find the segments with initial timestamp + <c> elements
    const segments = [];
    const contentSegments = [];
    
    // Look for all timestamp-initiated segments with <c> elements
    const timestampSegmentRegex = /<\d\d:\d\d:\d\d\.\d+>([^<]*<\/?c>.*?)(?=<\d\d:\d\d:\d\d\.\d+>|$)/g;
    let match;
    
    while ((match = timestampSegmentRegex.exec(currentText)) !== null) {
      contentSegments.push({
        fullMatch: match[0],
        index: match.index
      });
    }
    
    // If no content segments found, skip this entry
    if (contentSegments.length === 0) {
      return { ...modifiedEntry, text: '' };
    }
    
    // Find the first timestamp in the text
    const firstTimestampMatch = currentText.match(/<(\d\d:\d\d:\d\d\.\d+)>/);
    if (!firstTimestampMatch) {
      return { ...modifiedEntry, text: '' };
    }
    
    const firstTimestampIndex = currentText.indexOf(firstTimestampMatch[0]);
    
    // Check if there's a word before the first timestamp that should be kept
    // (i.e., if it's part of a segment with <c> elements)
    if (firstTimestampIndex > 0) {
      // Get the text before the first timestamp
      const textBeforeTimestamp = currentText.substring(0, firstTimestampIndex).trim();
      
      // If this text has no spaces, it's likely a single word we want to keep
      // Or if it ends with a word (has a space followed by non-space characters)
      const lastSpaceIndex = textBeforeTimestamp.lastIndexOf(' ');
      
      if (lastSpaceIndex === -1) {
        // It's a single word, keep it all
        segments.push(textBeforeTimestamp);
      } else {
        // It's multiple words, only keep the last word
        const lastWord = textBeforeTimestamp.substring(lastSpaceIndex + 1);
        segments.push(lastWord);
      }
    }
    
    // Add all the segments with <c> elements
    contentSegments.forEach(segment => {
      segments.push(segment.fullMatch);
    });
    
    // First clean the text by removing timestamp markers and <c> tags
    let cleanedText = cleanText(segments.join(''), false);
    
    // Then process styling tags if needed
    cleanedText = processStylingTags(cleanedText);
    
    modifiedEntry.text = cleanedText;
    
    return modifiedEntry;
  }).filter(entry => entry.text.trim() !== ''); // Remove entries with empty text

  console.log('Processed transcript:', processedTranscript.length, 'entries');
  return processedTranscript;
}

export { processTranscriptAlgo1, cleanText, processStylingTags }; 