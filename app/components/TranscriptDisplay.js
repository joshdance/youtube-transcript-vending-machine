import React, { useState } from 'react';
import TranscriptTypeBadge from './TranscriptTypeBadge';
import TranscriptViewToggle from './TranscriptViewToggle';
import CopyButton from './CopyButton';
import { processTranscriptAlgo1, cleanText } from '../utils/transcriptAlgo1';

const TranscriptDisplay = ({ transcript, transcriptUrl, transcriptType }) => {
  // Default to timestamps view
  const [viewMode, setViewMode] = useState('timestamps');
  
  if (!transcript) return null;
  
  // Function to handle view mode changes
  const handleViewChange = (mode) => {
    setViewMode(mode);
  };

  // Helper to get content for Raw view
  const getRawContent = () => {
    return JSON.stringify(transcript, null, 2);
  };
  
  // Raw view mode - shows the raw transcript data
  if (viewMode === 'raw' && transcriptUrl) {
    const rawContent = getRawContent();
    
    return (
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Raw Transcript Data</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
            <CopyButton content={rawContent} label="Raw" />
            <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
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
        
        {Array.isArray(transcript) ? (
          <pre className="whitespace-pre-wrap overflow-auto max-h-[500px] font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded">
            {rawContent}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap overflow-auto max-h-[500px] font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded">
            {rawContent}
          </pre>
        )}
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
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Transcript with Timestamps</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
            <CopyButton content={timestampContent} label="Timestamps" />
            <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
          </div>
        </div>
        <div className="space-y-4">
          {validProcessedTranscript.map((cue, index) => (
            <div key={index} className="pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="text-xs text-gray-500 mb-1">{cue.startTime} → {cue.endTime}</div>
              <p>{cue.text}</p>
            </div>
          ))}
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
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Text Only</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
            <CopyButton content={textContent} label="Text" />
            <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
          <p className="leading-relaxed">{textContent}</p>
        </div>
      </div>
    );
  }
  
  // Default view as fallback - If transcript is an object (usually for debug/error info)
  const defaultContent = JSON.stringify(transcript, null, 2);
  return (
    <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold">Transcript Data</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {transcriptType && <TranscriptTypeBadge type={transcriptType} />}
          <CopyButton content={defaultContent} label="Data" />
          <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
        </div>
      </div>
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
        {defaultContent}
      </pre>
    </div>
  );
};

export default TranscriptDisplay; 