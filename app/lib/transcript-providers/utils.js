/**
 * Shared utilities for transcript providers
 */

/**
 * Converts milliseconds to display timestamp (M:SS or H:MM:SS)
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted timestamp
 */
export function msToTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Converts VTT timestamp (HH:MM:SS.mmm) to milliseconds
 * @param {string} vttTime - VTT format timestamp
 * @returns {number} Milliseconds
 */
export function vttToMs(vttTime) {
  const [time, ms] = vttTime.split('.');
  const parts = time.split(':').map(Number);
  
  let hours = 0, minutes = 0, seconds = 0;
  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else {
    [minutes, seconds] = parts;
  }
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms || 0, 10);
}

