import React, { useState } from 'react';

const CopyButton = ({ content, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy content to clipboard:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3 py-1 text-sm rounded transition-colors ${
        copied 
          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
      aria-label={copied ? "Copied!" : `Copy ${label}`}
    >
      {copied ? "Copied!" : `Copy ${label}`}
    </button>
  );
};

export default CopyButton; 