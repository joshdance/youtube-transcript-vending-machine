// Toggle for development logging
const DEV_MODE = false;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return Response.json({ error: "Job ID is required" }, { status: 400 });
    }
    
    const SIEVE_API_KEY = process.env.SIEVE_API_KEY;
    
    if (!SIEVE_API_KEY) {
      return Response.json(
        { error: "Missing Sieve API key in server configuration" }, 
        { status: 500 }
      );
    }

    // Fetch the job result from Sieve
    const response = await fetch(`https://mango.sievedata.com/v2/jobs/${jobId}/output`, {
      headers: {
        'X-API-Key': SIEVE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (DEV_MODE) {
      console.log("Sieve job output:", data);
    }

    if (!response.ok) {
      console.error('Error fetching job output:', data);
      return Response.json(
        { error: "Failed to get transcript from Sieve API" },
        { status: response.status }
      );
    }

    // Extract transcript and URLs from the response
    const transcript = data.subtitles?.[0]?.text;
    const url = data.subtitles?.[0]?.url;
    const type = 'vtt'; // Sieve provides VTT format

    if (!transcript || !url) {
      console.error('Missing transcript or URL in response:', data);
      return Response.json(
        { error: "No transcript found in job output" },
        { status: 404 }
      );
    }

    return Response.json({
      transcript,
      url,
      type
    });
  } catch (error) {
    console.error('Error in transcripts GET route:', error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: "YouTube URL is required" }, { status: 400 });
    }
    
    // In a production app, you would store this in an environment variable
    const SIEVE_API_KEY = process.env.SIEVE_API_KEY;
    
    if (!SIEVE_API_KEY) {
      return Response.json(
        { error: "Missing Sieve API key in server configuration" }, 
        { status: 500 }
      );
    }
    
    const options = {
      method: 'POST',
      headers: {
        'X-API-Key': SIEVE_API_KEY, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Using the correct function name from the working curl example
        function: "sieve/youtube-downloader",
        inputs: {
          url: url,
          download_type: "subtitles",
          resolution: "highest-available",
          include_audio: true,
          start_time: 0,
          end_time: -1,
          include_metadata: false,
          metadata_fields: ["title", "thumbnail", "description", "duration"],
          include_subtitles: true,
          subtitle_languages: ["en"],
          video_format: "mp4",
          audio_format: "mp3"
        }
      })
    };

    // Only log in dev mode
    if (DEV_MODE) {
      console.log("Sending request to Sieve:", JSON.stringify(options.body, null, 2));
    }

    const response = await fetch('https://mango.sievedata.com/v2/push', options);
    const data = await response.json();
    
    // Only log in dev mode
    if (DEV_MODE) {
      console.log("Sieve API response:", data);
    }
    
    if (!response.ok) {
      // Always log errors
      console.error('Sieve API error:', data);
      return Response.json(
        { error: data.error || "Failed to get transcript from Sieve API" }, 
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error('Error in transcripts API:', error);
    return Response.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
} 