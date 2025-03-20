"use client";

import { useState, useEffect } from "react";
import JobStatus from "./components/JobStatus";
import ErrorMessage from "./components/ErrorMessage";
import TranscriptDisplay from "./components/TranscriptDisplay";
import VideoMetadata from "./components/VideoMetadata";
import AiSummary from "./components/AiSummary";
import { supabase } from "./utils/supabase";
import AuthComponent from "./components/Auth";

// Toggle for development logging
const DEV_MODE = false;

// Create a separate component for the main content
function MainContent({ session }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptUrl, setTranscriptUrl] = useState(null);
  const [transcriptType, setTranscriptType] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState(null);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [processingStates, setProcessingStates] = useState({});

  // Debug logging function to control output
  const debugLog = (...args) => {
    if (DEV_MODE) {
      console.log(...args);
    }
  };

  // Validate YouTube URL format
  const isValidYouTubeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check for youtube.com or youtu.be domains
      if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
        return { isValid: false, type: 'invalid', message: 'Not a YouTube URL' };
      }

      if (hostname.includes('youtube.com')) {
        const hasPlaylistId = urlObj.searchParams.has('list');
        const isPlaylistPage = urlObj.pathname === '/playlist';
        const hasVideoId = urlObj.searchParams.has('v');

        // Pure playlist URL
        if (isPlaylistPage && hasPlaylistId) {
          return { 
            isValid: true, 
            type: 'playlist',
            playlistId: urlObj.searchParams.get('list'),
            message: null 
          };
        }

        // Video within playlist
        if (hasVideoId && hasPlaylistId) {
          return { 
            isValid: true, 
            type: 'video_in_playlist',
            videoId: urlObj.searchParams.get('v'),
            playlistId: urlObj.searchParams.get('list'),
            message: null 
          };
        }

        // Single video
        if (hasVideoId) {
          return { 
            isValid: true, 
            type: 'video',
            videoId: urlObj.searchParams.get('v'),
            message: null 
          };
        }

        return { isValid: false, type: 'invalid', message: 'Invalid YouTube URL format' };
      } else {
        // youtu.be links
        return { 
          isValid: urlObj.pathname.length > 1,
          type: 'video',
          videoId: urlObj.pathname.slice(1),
          message: null
        };
      }
    } catch (e) {
      return { isValid: false, type: 'invalid', message: 'Invalid URL format' };
    }
  };

  // Effect to fetch metadata when URL changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!url) {
        setVideoMetadata(null);
        setPlaylistVideos(null);
        setIsPlaylist(false);
        return;
      }

      // Only proceed if URL is valid
      const urlValidation = isValidYouTubeUrl(url);
      if (!urlValidation.isValid) {
        setError(urlValidation.message || "Please enter a valid YouTube URL");
        setVideoMetadata(null);
        setPlaylistVideos(null);
        setIsPlaylist(false);
        return;
      }

      setIsFetchingMetadata(true);
      setError(null);
      
      try {
        if (urlValidation.type === 'playlist' || urlValidation.type === 'video_in_playlist') {
          // Fetch playlist videos
          const playlistResponse = await fetch(`/api/playlist-videos?playlistId=${urlValidation.playlistId}`);
          const playlistData = await playlistResponse.json();
          
          if (!playlistResponse.ok) {
            throw new Error(playlistData.error || "Failed to fetch playlist videos");
          }
          
          setPlaylistVideos(playlistData.videos);
          setIsPlaylist(true);
          setVideoMetadata(null); // Clear single video metadata
        } else {
          // Fetch single video metadata
          const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch video metadata");
          }
          
          setVideoMetadata(data.metadata);
          setPlaylistVideos(null);
          setIsPlaylist(false);
        }
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError(err.message || "Failed to fetch metadata");
        setVideoMetadata(null);
        setPlaylistVideos(null);
        setIsPlaylist(false);
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    if (url) {
      fetchMetadata();
    }
  }, [url]);

  // Clean up polling on unmount or when job completes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        debugLog("Cleaning up polling interval on unmount");
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Additional effect to stop polling when transcript is received
  useEffect(() => {
    if (transcript && pollingInterval) {
      debugLog("Transcript received, clearing polling interval");
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [transcript, pollingInterval]);

  // Function to download the raw transcript
  const downloadRawTranscript = async () => {
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
      setError("Failed to download transcript: " + err.message);
    }
  };

  // Function to check job status
  const checkJobStatus = async (id, videoId) => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/job-status?id=${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to check job status");
      }
      
      debugLog("Job status check:", data.status);
      
      // If job is complete, get the results
      if (data.status === "completed" || data.status === "success" || data.status === "finished") {
        // Clear polling interval
        if (pollingInterval) {
          debugLog("Job complete, clearing interval");
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        // Clear processing state for this specific video
        setProcessingStates(prev => ({ ...prev, [videoId]: false }));
        
        // Extract transcript URL if available
        if (data.outputs && data.outputs.length > 0 && data.outputs[0].data) {
          const outputData = data.outputs[0].data;
          // Check if it has subtitles
          if (outputData.en && outputData.en.url) {
            setTranscriptUrl(outputData.en.url);
            
            // Store the transcript if we have both URLs
            if (url) {
              console.log('Storing transcript...', { url, transcriptUrl: outputData.en.url });
              await storeTranscript(url, outputData.en.url);
            }
            
            // Fetch the VTT content
            try {
              debugLog("Fetching VTT content");
              const vttResponse = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(outputData.en.url));
              const vttData = await vttResponse.json();
              if (vttResponse.ok && vttData.content) {
                setTranscript(vttData.content);
                // Set the transcript type
                setTranscriptType(vttData.transcriptType || 'simple');
              } else {
                setTranscript({
                  message: "Transcript URL available but content couldn't be parsed",
                  transcriptUrl: outputData.en.url,
                  rawData: data
                });
              }
            } catch (vttError) {
              console.error("VTT fetch error:", vttError);
              setTranscript({
                message: "Transcript URL available but couldn't be fetched",
                transcriptUrl: outputData.en.url,
                error: vttError.message,
                rawData: data
              });
            }
          } else {
            // If no transcript URL found, just show the raw output
            setTranscript({
              message: "Job completed but no transcript URL found in expected format",
              rawOutput: outputData,
              rawData: data
            });
          }
        } else {
          setTranscript({
            message: "Job completed but no output data found",
            rawData: data
          });
        }
        
        setJobId(null);
      } else if (data.status === "failed" || data.status === "error") {
        setError("The transcript job failed. Please try again.");
        setJobId(null);
        
        // Clear polling interval
        if (pollingInterval) {
          debugLog("Job failed, clearing interval");
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
      
      return data;
    } catch (err) {
      console.error("Error checking job status:", err);
      setError(err.message || "Failed to check job status");
      
      // Clear processing state for this specific video
      setProcessingStates(prev => ({ ...prev, [videoId]: false }));
      
      // Clear polling interval
      if (pollingInterval) {
        debugLog("Error in job status check, clearing interval");
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const fetchTranscript = async (videoUrl = null) => {
    const targetUrl = videoUrl || url;
    const videoId = isValidYouTubeUrl(targetUrl).videoId;
    
    if (!targetUrl) {
      setError("Please enter a YouTube URL");
      return;
    }

    // Update loading state for this specific video
    setLoadingStates(prev => ({ ...prev, [videoId]: true }));
    setError(null);
    setTranscript(null);
    setTranscriptUrl(null);
    setTranscriptType(null);
    
    // Clear any existing polling
    if (pollingInterval) {
      debugLog("Starting new request, clearing existing interval");
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    try {
      debugLog("Fetching transcript for URL:", targetUrl);
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch transcript");
      }

      debugLog("Initial API response received");
      
      // The job ID might be in different places depending on the API response
      const jobId = data.id || (data.job && data.job.id);
      
      if (jobId) {
        debugLog("Got job ID:", jobId);
        setJobId(jobId);
        // Update processing state for this specific video
        setProcessingStates(prev => ({ ...prev, [videoId]: true }));
        
        // Start polling for job status
        const interval = setInterval(() => checkJobStatus(jobId, videoId), 5000);
        setPollingInterval(interval);
        
        // Also check immediately
        await checkJobStatus(jobId, videoId);
      } else if (data.outputs && data.outputs.length > 0) {
        // If we already have outputs (job already finished), process them
        debugLog("Job already completed, processing outputs");
        const outputData = data.outputs[0].data;
        if (outputData && outputData.en && outputData.en.url) {
          setTranscriptUrl(outputData.en.url);
          
          // Try to fetch and parse the VTT content
          try {
            const vttResponse = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(outputData.en.url));
            const vttData = await vttResponse.json();
            if (vttResponse.ok && vttData.content) {
              setTranscript(vttData.content);
              // Set the transcript type
              setTranscriptType(vttData.transcriptType || 'simple');
            } else {
              setTranscript({
                message: "Transcript URL available but content couldn't be parsed",
                transcriptUrl: outputData.en.url,
                rawData: data
              });
            }
          } catch (vttError) {
            console.error("Error fetching VTT:", vttError);
            setTranscript({
              message: "Transcript URL available but couldn't be fetched",
              transcriptUrl: outputData.en.url,
              error: vttError.message,
              rawData: data
            });
          }
        } else {
          // If no transcript URL found, just show the raw output
          setTranscript({
            message: "No transcript URL found in response",
            rawOutput: data
          });
        }
      } else {
        // If we don't have a job ID or outputs, show the raw response
        setTranscript({
          message: "Response doesn't contain expected job ID or outputs",
          rawResponse: data
        });
      }
    } catch (err) {
      console.error("Error fetching transcript:", err);
      setError(err.message || "An error occurred while fetching the transcript");
    } finally {
      // Clear loading state for this specific video
      setLoadingStates(prev => ({ ...prev, [videoId]: false }));
    }
  };

  // Add storeTranscript function to MainContent component
  const storeTranscript = async (youtubeUrl, transcriptUrl) => {
    try {
      // Check if we have a valid session
      if (!session) {
        console.error('No active session found');
        return;
      }

      console.log('Storing transcript:', { youtubeUrl, transcriptUrl });
      const response = await fetch('/api/store-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${session.access_token}` // Add the access token
        },
        credentials: 'include',
        body: JSON.stringify({
          youtubeUrl,
          transcriptUrl
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to store transcript:', data.error);
      } else {
        const data = await response.json();
        console.log('Successfully stored transcript:', data);
      }
    } catch (error) {
      console.error('Error storing transcript:', error);
    }
  };

  // Update the handleJobCompletion function
  const handleJobCompletion = async (jobId) => {
    try {
      console.log('handleJobCompletion called with jobId:', jobId);
      // The actual storage is now handled in checkJobStatus
    } catch (err) {
      console.error("Error handling job completion:", err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">YouTube Transcript Tool</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>
        <div className="flex flex-col items-center min-h-screen p-8 gap-8 font-[family-name:var(--font-geist-sans)]">
          <header className="w-full max-w-4xl mt-12 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              YouTube Transcript Vending Machine
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter a YouTube URL to get the video's transcript
            </p>
          </header>

          <main className="w-full max-w-4xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/playlist?list=..."
                className="flex-grow p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                disabled={Object.values(loadingStates).some(Boolean) || Object.values(processingStates).some(Boolean)}
              />
              {isPlaylist && playlistVideos ? (
                <button
                  onClick={() => fetchTranscript(url)}
                  disabled={Object.values(loadingStates).some(Boolean) || Object.values(processingStates).some(Boolean)}
                  className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
                >
                  {Object.values(loadingStates).some(Boolean) ? "Loading..." : 
                   Object.values(processingStates).some(Boolean) ? "Processing..." : 
                   `Get Transcripts (${playlistVideos.length} videos)`}
                </button>
              ) : (
                <button
                  onClick={() => fetchTranscript(url)}
                  disabled={Object.values(loadingStates).some(Boolean) || Object.values(processingStates).some(Boolean) || !videoMetadata}
                  className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
                >
                  {Object.values(loadingStates).some(Boolean) ? "Loading..." : 
                   Object.values(processingStates).some(Boolean) ? "Processing..." : 
                   "Get Transcript"}
                </button>
              )}
            </div>

            {isFetchingMetadata && (
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <p className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isPlaylist ? "Fetching playlist information..." : "Fetching video information..."}
                </p>
              </div>
            )}

            <ErrorMessage message={error} />
            
            {!error && <JobStatus jobId={jobId} onJobComplete={handleJobCompletion} />}
            
            {playlistVideos && (
              <div className="w-full space-y-4">
                {playlistVideos.map((video) => (
                  <VideoMetadata 
                    key={video.id}
                    metadata={video}
                    videoUrl={`https://www.youtube.com/watch?v=${video.id}`}
                    onTranscriptRequest={() => fetchTranscript(`https://www.youtube.com/watch?v=${video.id}`)}
                    isLoading={loadingStates[video.id]}
                    isProcessing={processingStates[video.id]}
                  />
                ))}
              </div>
            )}
            
            {!isPlaylist && videoMetadata && (
              <VideoMetadata 
                metadata={videoMetadata} 
                videoUrl={url}
                onTranscriptRequest={() => fetchTranscript(url)}
                isLoading={loadingStates[isValidYouTubeUrl(url).videoId]}
                isProcessing={processingStates[isValidYouTubeUrl(url).videoId]}
              />
            )}
            
            {transcript && (
              <TranscriptDisplay
                transcript={transcript}
                transcriptUrl={transcriptUrl}
                transcriptType={transcriptType}
                duration={videoMetadata?.duration}
                onDownloadRawTranscript={downloadRawTranscript}
              />
            )}
            
            {transcript && (
              <AiSummary 
                transcript={transcript} 
                onSummaryGenerated={(summary) => setAiSummary(summary)}
              />
            )}
          </main>
          
          <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
            Made with <span className="heart cursor-pointer select-none">❤️</span> by <a href="https://twitter.com/joshdance" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Josh Dance</a>
          <style jsx>{`
            @keyframes heartbeat {
              0% { transform: scale(1); }
              25% { transform: scale(1.1); }
              50% { transform: scale(1); }
              75% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
            .heart:hover {
              display: inline-block;
              animation: heartbeat 1s ease-in-out infinite;
            }
          `}</style>
          </footer>
        </div>
      </div>
    </main>
  );
}

// Main component that handles auth state
export default function Home() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold text-center mb-8">YouTube Transcript Tool</h1>
        <AuthComponent />
      </div>
    );
  }

  return <MainContent session={session} />;
}
