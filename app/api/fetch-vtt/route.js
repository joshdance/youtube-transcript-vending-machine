// Toggle for development logging
const DEV_MODE = false;

export async function GET(request) {
  try {
    // Get the VTT URL from the query parameters
    const { searchParams } = new URL(request.url);
    const vttUrl = searchParams.get('url');
    
    if (!vttUrl) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Log VTT request in dev mode only
    if (DEV_MODE) {
      console.log("Fetching VTT from:", vttUrl);
    }
    
    // Fetch the VTT file
    const response = await fetch(vttUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch VTT file: ${response.status} ${response.statusText}`);
      return Response.json(
        { error: `Failed to fetch VTT file: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      );
    }
    
    // Get the VTT content as text
    const vttContent = await response.text();
    
    // Log success in dev mode only
    if (DEV_MODE) {
      console.log("VTT fetch successful, content length:", vttContent.length);
    }
    
    // Detect transcript type and parse the VTT content
    const { parsedContent, transcriptType } = parseVTT(vttContent);
    
    return Response.json({
      content: parsedContent,
      rawContent: vttContent,
      transcriptType: transcriptType
    });
  } catch (error) {
    console.error('Error fetching VTT file:', error);
    return Response.json(
      { error: "Failed to fetch or parse VTT file" }, 
      { status: 500 }
    );
  }
}

//todo move this into a separate file
/**
 * Parse VTT format into a more usable structure and detect transcript type
 */
function parseVTT(vttContent) {
  // Split by double newline to get cues
  const lines = vttContent.trim().split('\n');
  
  // First line should be "WEBVTT", remove header lines
  let startIndex = 0;
  while (startIndex < lines.length && !lines[startIndex].includes('-->')) {
    startIndex++;
  }
  
  const cues = [];
  let currentCue = null;
  
  // For transcript type detection
  let hasWordByWordMarkers = false;
  let hasPositionAlignment = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this is a timestamp line (contains "-->")
    if (line.includes('-->')) {
      // Check for alignment/position markers (word-by-word format)
      if (line.includes('align:') || line.includes('position:')) {
        hasPositionAlignment = true;
      }
      
      // Start a new cue
      currentCue = {
        timeCode: line,
        text: ''
      };
      
      // Extract start and end times
      const times = line.split('-->').map(t => t.trim());
      currentCue.startTime = times[0];
      currentCue.endTime = times[1].split(' ')[0]; // Remove alignment info if present
      
      cues.push(currentCue);
    } 
    // If we have a current cue, add the text
    else if (currentCue) {
      // Check for word-by-word format markers like <00:00:01.234> or <c>
      if (line.includes('<00:') || line.includes('<c>')) {
        hasWordByWordMarkers = true;
      }
      
      if (currentCue.text) {
        currentCue.text += ' ' + line;
      } else {
        currentCue.text = line;
      }
    }
  }
  
  // Determine transcript type based on detected markers
  let transcriptType = "simple";
  if (hasWordByWordMarkers || hasPositionAlignment) {
    transcriptType = "word-by-word";
  }
  
  return {
    parsedContent: cues,
    transcriptType: transcriptType
  };
} 