import React, { useEffect } from 'react';

const JobStatus = ({ jobId, onJobComplete }) => {
  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/job-status?id=${jobId}`);
        const data = await response.json();
        
        console.log('Job status response:', data);
        // Check for both 'finished' and 'COMPLETED' status
        if (data.status === 'COMPLETED' || data.status === 'finished') {
          console.log('Job completed, calling onJobComplete with jobId:', jobId);
          onJobComplete(jobId);
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    };

    // Check immediately and then every 2 seconds
    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, onJobComplete]);

  if (!jobId) return null;
  
  return (
    <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      <p className="flex items-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing video transcript... (Job ID: {jobId})
      </p>
    </div>
  );
};

export default JobStatus;