"use client";

import { isValidYouTubeUrl } from './youtube';
import { storeTranscript } from './transcript';
import { debugLog } from './debug';

/**
 * Fetches and processes a transcript for a YouTube video
 * @param {Object} params - The parameters for fetching the transcript
 * @param {string} params.targetUrl - The YouTube video URL
 * @param {string} params.url - The current URL in the input field
 * @param {Object} params.session - The user's session object
 * @param {Object} params.states - State management object
 * @param {Function} params.states.setError - Function to set error state
 * @param {Function} params.states.setTranscript - Function to set transcript state
 * @param {Function} params.states.setTranscriptUrl - Function to set transcript URL state
 * @param {Function} params.states.setTranscriptType - Function to set transcript type state
 * @param {Function} params.states.setJobId - Function to set job ID state
 * @param {Function} params.states.setLoadingStates - Function to set loading states
 * @param {Function} params.states.setProcessingStates - Function to set processing states
 * @param {Object} params.intervals - Interval management object
 * @param {number|null} params.intervals.pollingInterval - Current polling interval
 * @param {Function} params.intervals.setPollingInterval - Function to set polling interval
 */
export async function fetchTranscript({
  targetUrl,
  url,
  session,
  states: {
    setError,
    setTranscript,
    setTranscriptUrl,
    setTranscriptType,
    setJobId,
    setLoadingStates,
    setProcessingStates
  },
  intervals: {
    pollingInterval,
    setPollingInterval
  }
}) {
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
      const interval = setInterval(
        () => checkJobStatus({
          id: jobId,
          videoId,
          url,
          session,
          states: {
            setError,
            setTranscript,
            setTranscriptUrl,
            setTranscriptType,
            setJobId,
            setProcessingStates
          },
          intervals: {
            pollingInterval,
            setPollingInterval
          }
        }),
        5000
      );
      setPollingInterval(interval);
      
      // Also check immediately
      await checkJobStatus({
        id: jobId,
        videoId,
        url,
        session,
        states: {
          setError,
          setTranscript,
          setTranscriptUrl,
          setTranscriptType,
          setJobId,
          setProcessingStates
        },
        intervals: {
          pollingInterval,
          setPollingInterval
        }
      });
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
}

/**
 * Checks the status of a transcript job
 * @param {Object} params - The parameters for checking job status
 * @param {string} params.id - The job ID
 * @param {string} params.videoId - The video ID
 * @param {string} params.url - The video URL
 * @param {Object} params.session - The user's session object
 * @param {Object} params.states - State management object
 * @param {Function} params.states.setError - Function to set error state
 * @param {Function} params.states.setTranscript - Function to set transcript state
 * @param {Function} params.states.setTranscriptUrl - Function to set transcript URL state
 * @param {Function} params.states.setTranscriptType - Function to set transcript type state
 * @param {Function} params.states.setJobId - Function to set job ID state
 * @param {Function} params.states.setProcessingStates - Function to set processing states
 * @param {Object} params.intervals - Interval management object
 * @param {number|null} params.intervals.pollingInterval - Current polling interval
 * @param {Function} params.intervals.setPollingInterval - Function to set polling interval
 */
async function checkJobStatus({
  id,
  videoId,
  url,
  session,
  states: {
    setError,
    setTranscript,
    setTranscriptUrl,
    setTranscriptType,
    setJobId,
    setProcessingStates
  },
  intervals: {
    pollingInterval,
    setPollingInterval
  }
}) {
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
          
          // Try to store the transcript, but don't let failures affect the display
          if (url) {
            try {
              console.log('Storing transcript...', { url, transcriptUrl: outputData.en.url });
              await storeTranscript(url, outputData.en.url, session);
            } catch (storeError) {
              // Log the error but continue with displaying the transcript
              console.error('Failed to store transcript:', storeError);
              // Don't set the error state as it would affect the UI
              debugLog('Continuing with transcript display despite storage error');
            }
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
} 