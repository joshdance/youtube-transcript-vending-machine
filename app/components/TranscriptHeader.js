import React from 'react';
import TranscriptTypeBadge from './TranscriptTypeBadge';
import TranscriptViewToggle from './TranscriptViewToggle';
import CopyButton from './CopyButton';

const TranscriptHeader = ({ 
  title, 
  wordCount, 
  wpm, 
  duration, 
  transcriptType, 
  copyContent, 
  viewMode,
  onViewChange,
  gradientColors = {
    from: 'blue-50',
    to: 'purple-50',
    darkFrom: 'blue-950/30',
    darkTo: 'purple-950/30'
  }
}) => {
  return (
    <div className="min-h-[120px] flex flex-col relative">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-r from-${gradientColors.from} to-${gradientColors.to} dark:from-${gradientColors.darkFrom} dark:to-${gradientColors.darkTo} opacity-50 z-0`}></div>
      
      {/* Header content */}
      <div className="flex-1 p-6 flex flex-col relative z-10">
        <div className="h-full flex flex-col gap-4">
          {/* Title row with copy button */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h2>
            <CopyButton content={copyContent} />
          </div>
          
          {/* Bottom row with stats and view toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>Words: {wordCount.toLocaleString()}</span>
                </div>
                <TranscriptTypeBadge type={transcriptType} />
              </div>
              {duration && wpm > 0 && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Speaking pace: {wpm} words/min</span>
                </div>
              )}
            </div>
            
            {/* View toggle */}
            <TranscriptViewToggle activeView={viewMode} onViewChange={onViewChange} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptHeader; 