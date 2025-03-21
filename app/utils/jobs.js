import { debugLog } from './debug';

/**
 * Checks the status of a transcript job
 * @param {string} jobId - The ID of the job to check
 * @param {string} videoId - The ID of the video being processed
 * @returns {Promise<Object>} The job status data
 * @throws {Error} If the status check fails
 */
export const checkJobStatus = async (jobId) => {
  if (!jobId) return null;
  
  try {
    const response = await fetch(`/api/job-status?id=${jobId}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to check job status");
    }
    
    debugLog("Job status check:", data.status);
    return data;
  } catch (err) {
    console.error("Error checking job status:", err);
    throw err;
  }
};

/**
 * Handles job completion
 * @param {string} jobId - The ID of the completed job
 * @returns {Promise<void>}
 */
export const handleJobCompletion = async (jobId) => {
  try {
    debugLog('handleJobCompletion called with jobId:', jobId);
    // Add any additional job completion handling here
  } catch (err) {
    console.error("Error handling job completion:", err);
    throw err;
  }
}; 