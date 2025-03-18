import React from 'react';

const TranscriptTypeBadge = ({ type }) => {
  if (!type) return null;
  
  const isWordByWord = type === 'word-by-word';
  
  const backgroundColor = isWordByWord 
    ? 'bg-purple-100 dark:bg-purple-900/20' 
    : 'bg-blue-100 dark:bg-blue-900/20';
  
  const textColor = isWordByWord 
    ? 'text-purple-700 dark:text-purple-400' 
    : 'text-blue-700 dark:text-blue-400';
  
  const borderColor = isWordByWord 
    ? 'border-purple-200 dark:border-purple-800' 
    : 'border-blue-200 dark:border-blue-800';
  
  const label = isWordByWord 
    ? 'Word-by-Word' 
    : 'Simple';
  
  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${backgroundColor} ${textColor} ${borderColor}`}>
      <span className="mr-1">
        {isWordByWord ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )}
      </span>
      {label}
    </div>
  );
};

export default TranscriptTypeBadge; 