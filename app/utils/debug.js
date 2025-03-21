// Toggle for development logging
export const DEV_MODE = true;

/**
 * Debug logging function that only outputs in development mode
 * @param {...any} args - Arguments to pass to console.log
 */
export const debugLog = (...args) => {
  if (DEV_MODE) {
    console.log(...args);
  }
}; 