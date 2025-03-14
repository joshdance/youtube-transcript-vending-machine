import React, { useState } from 'react';
import TranscriptTypeBadge from './TranscriptTypeBadge';
import TranscriptViewToggle from './TranscriptViewToggle';

// Helper function to clean transcript text
const cleanTranscriptText = (text) => {
  if (!text) return '';
  
  // Remove word-by-word specific markup
  return text
    .replace(/<\d\d:\d\d:\d\d\.\d+>/g, '') // Remove timestamp markers like <00:00:00.000>
    .replace(/<\/?\w>/g, '')               // Remove style tags like <c> and </c>
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();
};

const TranscriptDisplay = ({ transcript, transcriptUrl, transcriptType }) => {
  const [viewMode, setViewMode] = useState('simple');
  
  if (!transcript) return null;
  
  // Function to handle view mode changes
  const handleViewChange = (mode) => {
    setViewMode(mode);
  };
  
  // Raw view mode - shows the raw transcript data
  if (viewMode === 'raw' && transcriptUrl) {
    return (
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Transcript</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
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
            {JSON.stringify(transcript, null, 2)}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap overflow-auto max-h-[500px] font-[family-name:var(--font-geist-mono)] text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded">
            {JSON.stringify(transcript, null, 2)}
          </pre>
        )}
      </div>
    );
  }
  
  // Cleaned view mode - shows cleaned transcript text
  if (viewMode === 'cleaned' && Array.isArray(transcript)) {
    return (
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Transcript</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
            <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
          </div>
        </div>
        <div className="space-y-4">
          {transcript.map((cue, index) => (
            <div key={index} className="pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="text-xs text-gray-500 mb-1">{cue.startTime} → {cue.endTime}</div>
              <p>{cleanTranscriptText(cue.text)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Simple view mode - shows the formatted transcript without cleaning
  if (Array.isArray(transcript)) {
    return (
      <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-xl font-bold">Transcript</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <TranscriptTypeBadge type={transcriptType} />
            <TranscriptViewToggle activeView={viewMode} onViewChange={handleViewChange} />
          </div>
        </div>
        <div className="space-y-4">
          {transcript.map((cue, index) => (
            <div key={index} className="pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="text-xs text-gray-500 mb-1">{cue.startTime} → {cue.endTime}</div>
              <p>{cue.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // If transcript is an object (usually for debug/error info)
  return (
    <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold">Transcript Data</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {transcriptType && <TranscriptTypeBadge type={transcriptType} />}
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
        {JSON.stringify(transcript, null, 2)}
      </pre>
    </div>
  );
};

export default TranscriptDisplay; 