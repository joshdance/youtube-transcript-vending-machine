import React from 'react';

const TranscriptViewToggle = ({ activeView, onViewChange }) => {
  // Define available views
  const views = [
    { id: 'timestamps', label: 'Transcript with Timestamps' },
    { id: 'textonly', label: 'Text Only' },
    { id: 'raw', label: 'Raw' }
  ];
  
  return (
    <div className="inline-flex rounded-md shadow-sm mb-4" role="group">
      {views.map((view, index) => (
        <button
          key={view.id}
          type="button"
          onClick={() => onViewChange(view.id)}
          className={`px-4 py-2 text-sm font-medium ${
            activeView === view.id
              ? 'bg-foreground text-background hover:bg-gray-700 dark:hover:bg-gray-300'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          } ${
            index === 0 ? 'rounded-l-md' : ''
          } ${
            index === views.length - 1 ? 'rounded-r-md' : ''
          } border border-gray-300 dark:border-gray-600 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-700`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
};

export default TranscriptViewToggle; 