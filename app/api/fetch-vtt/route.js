export async function GET(request) {
  try {
    // Get the VTT URL from the query parameters
    const { searchParams } = new URL(request.url);
    const vttUrl = searchParams.get('url');
    
    if (!vttUrl) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }
    
    // Fetch the VTT file
    const response = await fetch(vttUrl);
    
    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch VTT file: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      );
    }
    
    // Get the VTT content as text
    const vttContent = await response.text();
    
    // Parse the VTT content into a more usable format
    const parsedContent = parseVTT(vttContent);
    
    return Response.json({
      content: parsedContent,
      rawContent: vttContent
    });
  } catch (error) {
    console.error('Error fetching VTT file:', error);
    return Response.json(
      { error: "Failed to fetch or parse VTT file" }, 
      { status: 500 }
    );
  }
}

/**
 * Parse VTT format into a more usable structure
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
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this is a timestamp line (contains "-->")
    if (line.includes('-->')) {
      // Start a new cue
      currentCue = {
        timeCode: line,
        text: ''
      };
      
      // Extract start and end times
      const times = line.split('-->').map(t => t.trim());
      currentCue.startTime = times[0];
      currentCue.endTime = times[1];
      
      cues.push(currentCue);
    } 
    // If we have a current cue, add the text
    else if (currentCue) {
      if (currentCue.text) {
        currentCue.text += ' ' + line;
      } else {
        currentCue.text = line;
      }
    }
  }
  
  return cues;
} 