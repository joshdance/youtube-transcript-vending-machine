"use client";

import { useState, useEffect } from "react";
import JobStatus from "./components/JobStatus";
import ErrorMessage from "./components/ErrorMessage";
import TranscriptDisplay from "./components/TranscriptDisplay";
import VideoMetadata from "./components/VideoMetadata";
import AiSummary from "./components/AiSummary";
import AuthProvider from "./components/AuthProvider";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import { isValidYouTubeUrl, fetchMetadata } from "./utils/youtube";
import { downloadRawTranscript } from "./utils/transcript";
import { handleJobCompletion } from "./utils/jobs";
import { fetchTranscript } from "./utils/fetchTranscript";

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

  // Effect to fetch metadata when URL changes
  useEffect(() => {
    const loadMetadata = async () => {
      if (!url) {
        setVideoMetadata(null);
        setPlaylistVideos(null);
        setIsPlaylist(false);
        return;
      }

      setIsFetchingMetadata(true);
      setError(null);
      
      try {
        const { videoMetadata: metadata, playlistVideos: videos, isPlaylist: playlist } = await fetchMetadata(url);
        setVideoMetadata(metadata);
        setPlaylistVideos(videos);
        setIsPlaylist(playlist);
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError(err.message);
        setVideoMetadata(null);
        setPlaylistVideos(null);
        setIsPlaylist(false);
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    loadMetadata();
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

  const handleFetchTranscript = async (videoUrl = null) => {
    await fetchTranscript({
      targetUrl: videoUrl || url,
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
    });
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
          <Header />
          <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
            <Hero />
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
                  onClick={() => handleFetchTranscript(url)}
                  disabled={Object.values(loadingStates).some(Boolean) || Object.values(processingStates).some(Boolean)}
                  className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
                >
                  {Object.values(loadingStates).some(Boolean) ? "Loading..." : 
                   Object.values(processingStates).some(Boolean) ? "Processing..." : 
                   `Get Transcripts (${playlistVideos.length} videos)`}
                </button>
              ) : (
                <button
                  onClick={() => handleFetchTranscript(url)}
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
                    onTranscriptRequest={() => handleFetchTranscript(`https://www.youtube.com/watch?v=${video.id}`)}
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
                onTranscriptRequest={() => handleFetchTranscript(url)}
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
                onDownloadRawTranscript={() => downloadRawTranscript(transcriptUrl)}
              />
            )}
            
            {transcript && (
              <AiSummary 
                transcript={transcript} 
                onSummaryGenerated={(summary) => setAiSummary(summary)}
              />
            )}
          </main>
          
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      {(session) => <MainContent session={session} />}
    </AuthProvider>
  );
}
