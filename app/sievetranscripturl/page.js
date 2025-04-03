"use client";

import { useState, useEffect } from "react";
import TranscriptDisplay from "../components/TranscriptDisplay";
import ErrorMessage from "../components/ErrorMessage";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthProvider from "../components/AuthProvider";
import { processTranscriptAlgo1, cleanText } from "../utils/transcriptAlgo1";
import DownloadButton from "../components/DownloadButton";

// Toggle for development logging
const DEV_MODE = false;

// Create a separate component for the main content
function MainContent({ session }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [transcriptUrl, setTranscriptUrl] = useState(null);
  const [transcriptType, setTranscriptType] = useState(null);
  const [error, setError] = useState(null);
  const [rawVttContent, setRawVttContent] = useState(null);

  // Debug logging function to control output
  const debugLog = (...args) => {
    if (DEV_MODE) {
      console.log(...args);
    }
  };

  const handleFetchTranscript = async () => {
    if (!url) {
      setError("Please enter a Sieve transcript URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscript(null);
    setTranscriptUrl(null);
    setTranscriptType(null);
    setRawVttContent(null);

    try {
      debugLog("Fetching transcript from URL:", url);
      
      // Fetch the transcript directly from the URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status} ${response.statusText}`);
      }
      
      const vttContent = await response.text();
      setRawVttContent(vttContent);
      
      // Process the VTT content to extract transcript data
      const processedTranscript = processVttContent(vttContent);
      
      setTranscript(processedTranscript);
      setTranscriptUrl(url);
      setTranscriptType('vtt');
      
    } catch (err) {
      console.error("Error fetching transcript:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Process VTT content to extract transcript data
  const processVttContent = (vttContent) => {
    // Split the VTT content into lines
    const lines = vttContent.split('\n');
    
    // Initialize variables
    const transcriptData = [];
    let currentEntry = null;
    let currentCueId = 0;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and WEBVTT header
      if (!line || line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) {
        continue;
      }
      
      // Check if this line is a timestamp line (e.g., "00:00:00.000 --> 00:00:02.583")
      if (line.includes('-->')) {
        // If we have a previous entry, add it to the transcript data
        if (currentEntry) {
          // Add the closing timestamp marker
          currentEntry.text += `<${currentEntry.endTime}>`;
          transcriptData.push(currentEntry);
        }
        
        // Create a new entry
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        currentEntry = {
          id: currentCueId++,
          startTime: startTime,
          endTime: endTime,
          text: `<${startTime}>`  // Start with the opening timestamp
        };
      } 
      // If we have a current entry and this line is not a timestamp, it's text
      else if (currentEntry) {
        // For text lines, we need to:
        // 1. Keep the HTML tags (like <b>) as they are
        // 2. Wrap the text in <c> tags that the transcript algo expects
        const cleanedLine = line
          .replace(/^<\d+>$/, '') // Remove cue numbers if present
          .trim();
          
        if (cleanedLine) {
          // Add the text wrapped in <c> tags
          currentEntry.text += `<c>${cleanedLine}</c>`;
        }
      }
    }
    
    // Add the last entry if it exists
    if (currentEntry) {
      // Add the closing timestamp marker
      currentEntry.text += `<${currentEntry.endTime}>`;
      transcriptData.push(currentEntry);
    }
    
    // Process the transcript using the same algorithm as the main page
    const processedTranscript = processTranscriptAlgo1(transcriptData);
    
    // If the processed transcript is empty, return the original transcript data
    if (!processedTranscript || processedTranscript.length === 0) {
      return transcriptData;
    }
    
    return processedTranscript;
  };

  // Function to download the raw transcript
  const handleDownloadRawTranscript = () => {
    if (!rawVttContent) return;
    
    // Create a blob with the VTT content
    const blob = new Blob([rawVttContent], { type: 'text/vtt' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.vtt';
    
    // Append the link to the document, click it, and remove it
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);
  };

  // Pre-fill the URL input with the example URL if it's empty
  useEffect(() => {
    if (!url) {
      setUrl("https://sieve-prod-us-central1-persistent-bucket.storage.googleapis.com/cf411189-c2ae-4440-8f51-dbd263aa2e81/f4b3207a-2b0a-42d3-84ae-2cc6dff30406/0252eda4-e09f-497c-a47f-7b467d9f4951/tmp3jf3s0pl.vtt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=abhi-admin%40sieve-grapefruit.iam.gserviceaccount.com%2F20250403%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20250403T184640Z&X-Goog-Expires=172800&X-Goog-SignedHeaders=host&x-goog-signature=9a88cd84b8ffc19c99262da74b626a7715e582d240e95c9dbd209bf0449c1316b5b5a7e0c4ad027af102cf290a27b86a1e121e8d59158bf3d1bc8a2c365b547ab6416beb18b82050f7194f88d0c72807c790f81a45a4e90b89ff2fd09089c0c5d32e8a612b33741218dc6819cf244813e6a681489663ae651358ac866a908891c802b32ed2abe768ca64d50a5f8dd5377e680e295b15e3797dc451de308e459313bd69238ee4c24e334fd3e1da8da19cc1f88acaec159846e43d17bcc04d180b79060a8e3d33e13b066756069e4289b11e11e72ac24a0b960323193d7898facd7fb4ffa41e2a51001fe302fe2a4a07b6cd3f4dcb797621edad42843696e3312e");
    }
  }, []);

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
          <Header session={session} />
          <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-2">Sieve Transcript URL</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Enter a Sieve transcript URL to display the transcript
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://sieve-prod-us-central1-persistent-bucket.storage.googleapis.com/..."
                className="flex-grow p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                disabled={isLoading}
              />
              <button
                onClick={handleFetchTranscript}
                disabled={isLoading}
                className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Get Transcript"}
              </button>
            </div>

            {isLoading && (
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <p className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching transcript...
                </p>
              </div>
            )}

            <ErrorMessage message={error} />
            
            {transcript && (
              <>
                <div className="flex justify-end">
                  <DownloadButton 
                    onClick={handleDownloadRawTranscript}
                    disabled={!rawVttContent}
                  />
                </div>
                <TranscriptDisplay
                  transcript={transcript}
                  transcriptUrl={transcriptUrl}
                  transcriptType={transcriptType}
                />
              </>
            )}
          </main>
          
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function SieveTranscriptUrl() {
  return (
    <AuthProvider>
      {(session) => <MainContent session={session} />}
    </AuthProvider>
  );
} 