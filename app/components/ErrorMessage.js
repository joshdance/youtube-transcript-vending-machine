import React from 'react';

const ErrorMessage = ({ message }) => {
  if (!message) return null;
  
  return (
    <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
      {message}
    </div>
  );
};

export default ErrorMessage; 