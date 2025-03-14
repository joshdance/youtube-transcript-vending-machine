"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptUrl, setTranscriptUrl] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  // Function to check job status
  const checkJobStatus = async (id) => {
    try {
      const response = await fetch(`/api/job-status?id=${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to check job status");
      }
      
      console.log("Job status check:", data.status);
      
      // If job is complete, get the results
      if (data.status === "completed" || data.status === "success" || data.status === "finished") {
        // Clear polling interval
        if (pollingInterval) {
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
              const vttResponse = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(outputData.en.url));
              const vttData = await vttResponse.json();
              if (vttResponse.ok && vttData.content) {
                setTranscript(vttData.content);
              } else {
                setTranscript({
                  message: "Transcript URL available but content couldn't be parsed",
                  transcriptUrl: outputData.en.url,
                  rawData: data
                });
              }
            } catch (vttError) {
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
    
    // Clear any existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    try {
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

      console.log("Initial API response:", data);

      // The job ID might be in different places depending on the API response
      const jobId = data.id || (data.job && data.job.id);
      
      if (jobId) {
        console.log("Got job ID:", jobId);
        setJobId(jobId);
        
        // Start polling for job status
        const interval = setInterval(() => checkJobStatus(jobId), 5000);
        setPollingInterval(interval);
        
        // Also check immediately
        await checkJobStatus(jobId);
      } else if (data.outputs && data.outputs.length > 0) {
        // If we already have outputs (job already finished), process them
        const outputData = data.outputs[0].data;
        if (outputData && outputData.en && outputData.en.url) {
          setTranscriptUrl(outputData.en.url);
          
          // Try to fetch and parse the VTT content
          try {
            const vttResponse = await fetch('/api/fetch-vtt?url=' + encodeURIComponent(outputData.en.url));
            const vttData = await vttResponse.json();
            if (vttResponse.ok && vttData.content) {
              setTranscript(vttData.content);
            } else {
              setTranscript({
                message: "Transcript URL available but content couldn't be parsed",
                transcriptUrl: outputData.en.url,
                rawData: data
              });
            }
          } catch (vttError) {
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

        {error && (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {jobId && !error && (
          <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <p className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing video transcript... (Job ID: {jobId})
            </p>
          </div>
        )}

        {transcript && Array.isArray(transcript) && (
          <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4">Transcript</h2>
            <div className="space-y-4">
              {transcript.map((cue, index) => (
                <div key={index} className="pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="text-xs text-gray-500 mb-1">{cue.startTime} → {cue.endTime}</div>
                  <p>{cue.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {transcript && !Array.isArray(transcript) && (
          <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4">Transcript Data</h2>
            {transcriptUrl && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-medium">Transcript URL:</p>
                <a 
                  href={transcriptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {transcriptUrl}
                </a>
              </div>
            )}
            <pre className="whitespace-pre-wrap overflow-auto max-h-[500px] font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded">
              {JSON.stringify(transcript, null, 2)}
            </pre>
          </div>
        )}
      </main>
      
      <footer className="mt-auto py-6 text-center text-gray-500 text-sm">
        Powered by Sieve and Next.js
      </footer>
    </div>
  );
}
