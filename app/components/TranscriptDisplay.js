import React, { useState, useRef } from 'react';
import TranscriptHeader from './TranscriptHeader';
import { processTranscriptAlgo1, cleanText } from '../utils/transcriptAlgo1';
import DownloadButton from './DownloadButton';

const TranscriptDisplay = ({ transcript, transcriptUrl, transcriptType, duration, onDownloadRawTranscript }) => {
  // Default to timestamps view
  const [viewMode, setViewMode] = useState('timestamps');
  const transcriptContentRef = useRef(null);
  
  const scrollToTop = () => {
    transcriptContentRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    if (transcriptContentRef.current) {
      transcriptContentRef.current.scrollTo({
        top: transcriptContentRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Navigation button component
  const ScrollButton = ({ onClick, isTop }) => (
    <button
      onClick={onClick}
      className="absolute right-4 z-10 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-md hover:bg-white dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
      aria-label={isTop ? "Scroll to bottom" : "Scroll to top"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-gray-600 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isTop ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"}
        />
      </svg>
    </button>
  );
  
  if (!transcript) return null;
  
  // Function to handle view mode changes
  const handleViewChange = (mode) => {
    setViewMode(mode);
  };

  // Helper to get content for Raw view
  const getRawContent = () => {
    return JSON.stringify(transcript, null, 2);
  };

  // Helper to convert duration (HH:MM:SS) to minutes
  const getDurationInMinutes = () => {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 60 + parts[1] + parts[2] / 60;
    } else if (parts.length === 2) {
      // MM:SS format
      return parts[0] + parts[1] / 60;
    }
    return 0;
  };

  // Helper to count words in transcript
  const getWordCount = () => {
    if (!Array.isArray(transcript)) return 0;
    
    const processedTranscript = processTranscriptAlgo1(transcript);
    const validTranscript = Array.isArray(processedTranscript) && processedTranscript.length > 0
      ? processedTranscript.filter(cue => cue && cue.text && cue.text.trim() !== '')
      : transcript;
    
    const textContent = validTranscript.map(cue => cue.text).join(' ');
    return textContent.trim().split(/\s+/).length;
  };

  // Helper to get words per minute
  const getWordsPerMinute = () => {
    const wordCount = getWordCount();
    const durationInMinutes = getDurationInMinutes();
    if (durationInMinutes === 0) return 0;
    return Math.round(wordCount / durationInMinutes);
  };
  
  // Raw view mode - shows the raw transcript data
  if (viewMode === 'raw' && transcriptUrl) {
    const rawContent = getRawContent();
    
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <TranscriptHeader
          title="Raw Transcript Data"
          wordCount={getWordCount()}
          wpm={getWordsPerMinute()}
          duration={duration}
          transcriptType={transcriptType}
          copyContent={rawContent}
          copyLabel="Raw"
          viewMode={viewMode}
          onViewChange={handleViewChange}
          gradientColors={{
            from: 'orange-50',
            to: 'red-50',
            darkFrom: 'orange-950/30',
            darkTo: 'red-950/30'
          }}
        />
        
        <div className="border-t border-gray-200 dark:border-gray-700 relative">
          <ScrollButton onClick={scrollToBottom} isTop={true} />
          <div ref={transcriptContentRef} className="max-h-[60vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="font-medium mb-2">Transcript URL:</p>
                <a 
                  href={transcriptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {transcriptUrl}
                </a>
              </div>
              
              <div className="flex justify-center mb-4">
                <DownloadButton onDownload={onDownloadRawTranscript} />
              </div>
              
              <pre className="whitespace-pre-wrap font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {rawContent}
              </pre>
            </div>
          </div>
          <ScrollButton onClick={scrollToTop} isTop={false} />
        </div>
      </div>
    );
  }
  
  // Transcript with Timestamps view mode (using Algo 1)
  if (viewMode === 'timestamps' && Array.isArray(transcript)) {
    console.log('Original transcript for timestamps view:', transcript.length, 'entries');
    const processedTranscript = processTranscriptAlgo1(transcript);
    console.log('Processed transcript for timestamps view:', processedTranscript.length, 'entries');
    
    // Make sure we have valid results to display
    const validProcessedTranscript = Array.isArray(processedTranscript) && processedTranscript.length > 0
      ? processedTranscript.filter(cue => cue && cue.text && cue.text.trim() !== '')
      : transcript;
    
    // Generate content for copy
    const timestampContent = validProcessedTranscript.map(cue => 
      `[${cue.startTime} → ${cue.endTime}] ${cue.text}`
    ).join('\n');
    
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <TranscriptHeader
          title="Transcript with Timestamps"
          wordCount={getWordCount()}
          wpm={getWordsPerMinute()}
          duration={duration}
          transcriptType={transcriptType}
          copyContent={timestampContent}
          copyLabel="Timestamps"
          viewMode={viewMode}
          onViewChange={handleViewChange}
        />
        
        {/* Transcript content */}
        <div className="border-t border-gray-200 dark:border-gray-700 relative">
          <ScrollButton onClick={scrollToBottom} isTop={true} />
          <div ref={transcriptContentRef} className="max-h-[60vh] overflow-y-auto">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {validProcessedTranscript.map((cue, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{cue.startTime} → {cue.endTime}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{cue.text}</p>
                </div>
              ))}
            </div>
          </div>
          <ScrollButton onClick={scrollToTop} isTop={false} />
        </div>
      </div>
    );
  }
  
  // Text Only view mode - displays just the text without timestamps
  if (viewMode === 'textonly' && Array.isArray(transcript)) {
    // Use the same processing as timestamps view, but join all lines into a single text block
    console.log('Original transcript for text-only view:', transcript.length, 'entries');
    const processedTranscript = processTranscriptAlgo1(transcript);
    console.log('Processed transcript for text-only view:', processedTranscript.length, 'entries');
    
    // Make sure we have valid results
    const validProcessedTranscript = Array.isArray(processedTranscript) && processedTranscript.length > 0
      ? processedTranscript.filter(cue => cue && cue.text && cue.text.trim() !== '')
      : transcript;
    
    // Extract just the text content without timestamps
    const textContent = validProcessedTranscript.map(cue => cue.text).join(' ');
    
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <TranscriptHeader
          title="Text Only"
          wordCount={getWordCount()}
          wpm={getWordsPerMinute()}
          duration={duration}
          transcriptType={transcriptType}
          copyContent={textContent}
          copyLabel="Text"
          viewMode={viewMode}
          onViewChange={handleViewChange}
          gradientColors={{
            from: 'green-50',
            to: 'blue-50',
            darkFrom: 'green-950/30',
            darkTo: 'blue-950/30'
          }}
        />
        
        {/* Text content */}
        <div className="border-t border-gray-200 dark:border-gray-700 relative">
          <ScrollButton onClick={scrollToBottom} isTop={true} />
          <div ref={transcriptContentRef} className="max-h-[60vh] overflow-y-auto">
            <div className="p-6 leading-relaxed text-gray-700 dark:text-gray-300">
              {textContent}
            </div>
          </div>
          <ScrollButton onClick={scrollToTop} isTop={false} />
        </div>
      </div>
    );
  }
  
  // Default view as fallback - If transcript is an object (usually for debug/error info)
  const defaultContent = JSON.stringify(transcript, null, 2);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <TranscriptHeader
        title="Transcript Data"
        wordCount={getWordCount()}
        wpm={getWordsPerMinute()}
        duration={duration}
        transcriptType={transcriptType}
        copyContent={defaultContent}
        copyLabel="Data"
        viewMode={viewMode}
        onViewChange={handleViewChange}
        gradientColors={{
          from: 'gray-50',
          to: 'gray-100',
          darkFrom: 'gray-950/30',
          darkTo: 'gray-900/30'
        }}
      />
      
      <div className="border-t border-gray-200 dark:border-gray-700 relative">
        <ScrollButton onClick={scrollToBottom} isTop={true} />
        <div ref={transcriptContentRef} className="max-h-[60vh] overflow-y-auto">
          {transcriptUrl && (
            <div className="p-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="font-medium mb-2">Transcript URL:</p>
                <a 
                  href={transcriptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="break-all text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {transcriptUrl}
                </a>
              </div>
            </div>
          )}
          
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {defaultContent}
            </pre>
          </div>
        </div>
        <ScrollButton onClick={scrollToTop} isTop={false} />
      </div>
    </div>
  );
};

export default TranscriptDisplay; 