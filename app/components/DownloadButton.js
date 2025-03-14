import React from 'react';

const DownloadButton = ({ onDownload, disabled = false }) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={onDownload}
        disabled={disabled}
        className="py-2 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:bg-green-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Raw Transcript
      </button>
    </div>
  );
};

export default DownloadButton; 