import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CopyButton from './CopyButton';

const AiSummary = ({ transcript, onSummaryGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  const generateSummary = async () => {
    if (!transcript) {
      setError("No transcript data available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          customPrompt: customPrompt || undefined, // Only send if not empty
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummary(data.summary);
      
      // Notify parent component if callback is provided
      if (onSummaryGenerated) {
        onSummaryGenerated(data.summary);
      }
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setError(err.message || 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-xl font-bold">AI Summary</h2>
        <div className="flex gap-2 mt-2 sm:mt-0">
          {summary && <CopyButton content={summary} label="Summary" />}
          <button
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            {showPromptEditor ? 'Hide Prompt Editor' : 'Edit Prompt'}
          </button>
          <button
            onClick={generateSummary}
            disabled={isLoading}
            className={`px-3 py-1 text-sm text-white rounded transition-colors ${
              isLoading 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {showPromptEditor && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Custom Prompt (optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Take this YouTube Transcript and create a detailed summary. Include any surprising or unusual findings. Don't leave out anything critical"
            className="w-full h-24 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-md">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {summary ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md overflow-auto max-h-[500px]">
          <article className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown>
              {summary}
            </ReactMarkdown>
          </article>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md text-gray-500 dark:text-gray-400 text-center">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p>Generating summary with Google Gemini AI...</p>
              <p className="text-xs mt-1">(This may take a moment)</p>
            </div>
          ) : (
            <p>Click "Generate Summary" to create an AI-powered summary of the transcript</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AiSummary; 