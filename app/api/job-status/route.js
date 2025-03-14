// Toggle for development logging
const DEV_MODE = false;

export async function GET(request) {
  try {
    // Get the job ID from the URL query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    
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
    
    // Make a request to Sieve's job status endpoint
    const response = await fetch(`https://mango.sievedata.com/v2/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': SIEVE_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    // Only log in dev mode
    if (DEV_MODE) {
      console.log("Job status response:", data);
    }
    
    if (!response.ok) {
      return Response.json(
        { error: data.error || "Failed to get job status from Sieve API" }, 
        { status: response.status }
      );
    }
    
    return Response.json(data);
  } catch (error) {
    console.error('Error checking job status:', error);
    return Response.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
} 