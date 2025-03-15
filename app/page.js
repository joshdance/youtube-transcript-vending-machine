"use client";

import { useState, useEffect } from "react";
import JobStatus from "./components/JobStatus";
import ErrorMessage from "./components/ErrorMessage";
import DownloadButton from "./components/DownloadButton";
import TranscriptDisplay from "./components/TranscriptDisplay";
import VideoMetadata from "./components/VideoMetadata";

// Toggle for development logging
const DEV_MODE = false;

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptUrl, setTranscriptUrl] = useState(null);
  const [transcriptType, setTranscriptType] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  // Debug logging function to control output
  const debugLog = (...args) => {
    if (DEV_MODE) {
      console.log(...args);
    }
  };

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

  // Function to fetch video metadata
  const fetchVideoMetadata = async (videoUrl) => {
    if (!videoUrl) {
      throw new Error('Tried to fetch video metadata but there was no video URL');
      return;
    }
    
    try {
      debugLog("Fetching video metadata for:", videoUrl);
      const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(videoUrl)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video metadata");
      }
      
      debugLog("Video metadata received:", data.metadata);
      setVideoMetadata(data.metadata);
    } catch (err) {
      console.error("Error fetching video metadata:", err);
      // Don't set error state here to avoid blocking the transcript fetch
      // Just log the error
    }
  };

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
  const checkJobStatus = async (id) => {
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
        
        // Extract transcript URL if available
        if (data.outputs && data.outputs.length > 0 && data.outputs[0].data) {
          const outputData = data.outputs[0].data;
          // Check if it has subtitles
          if (outputData.en && outputData.en.url) {
            setTranscriptUrl(outputData.en.url);
            
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
      
      // Clear polling interval
      if (pollingInterval) {
        debugLog("Error in job status check, clearing interval");
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const fetchTranscript = async () => {
    if (!url) {
      setError("Please enter a YouTube URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscript(null);
    setTranscriptUrl(null);
    setTranscriptType(null);
    setVideoMetadata(null);
    
    // Clear any existing polling
    if (pollingInterval) {
      debugLog("Starting new request, clearing existing interval");
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    // Fetch video metadata
    fetchVideoMetadata(url);

    try {
      debugLog("Fetching transcript for URL:", url);
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
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
        
        // Start polling for job status
        const interval = setInterval(() => checkJobStatus(jobId), 5000);
        setPollingInterval(interval);
        
        // Also check immediately
        await checkJobStatus(jobId);
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
      setIsLoading(false);
    }
  };

  return (
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
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-grow p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            disabled={isLoading || jobId}
          />
          <button
            onClick={fetchTranscript}
            disabled={isLoading || jobId}
            className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? "Loading..." : jobId ? "Processing..." : "Get Transcript"}
          </button>
        </div>

        {transcriptUrl && <DownloadButton onDownload={downloadRawTranscript} />}
        
        <ErrorMessage message={error} />
        
        {!error && <JobStatus jobId={jobId} />}
        
        {videoMetadata && <VideoMetadata metadata={videoMetadata} videoUrl={url} />}
        
        <TranscriptDisplay 
          transcript={transcript} 
          transcriptUrl={transcriptUrl} 
          transcriptType={transcriptType}
        />
      </main>
      
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        Powered by Sieve and Next.js
      </footer>
    </div>
  );
}
