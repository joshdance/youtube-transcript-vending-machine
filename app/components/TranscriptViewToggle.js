import React from 'react';

const TranscriptViewToggle = ({ activeView, onViewChange }) => {
  // Define available views with icons
  const views = [
    { 
      id: 'timestamps', 
      label: 'Transcript',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'textonly', 
      label: 'Text Only',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      )
    },
    { 
      id: 'raw', 
      label: 'Raw',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    }
  ];
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 inline-flex shadow-sm" role="group">
      {views.map((view, index) => (
        <button
          key={view.id}
          type="button"
          onClick={() => onViewChange(view.id)}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
            transition-all duration-200
            ${activeView === view.id
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
            }
          `}
        >
          {view.icon}
          {view.label}
        </button>
      ))}
    </div>
  );
};

export default TranscriptViewToggle; 