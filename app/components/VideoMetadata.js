import Image from 'next/image';
import { useState } from 'react';

export default function VideoMetadata({ metadata, videoUrl, onTranscriptRequest, isLoading, isProcessing }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!metadata) return null;

  const {
    title,
    channelTitle,
    channelId,
    publishedAt,
    viewCount,
    likeCount,
    description,
    thumbnailUrl,
  } = metadata;

  // Create YouTube channel URL from channel ID
  const channelUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : null;

  // Format date
  const formattedDate = publishedAt ? new Date(publishedAt).toLocaleDateString() : '';
  
  // Format view count with commas
  const formattedViewCount = viewCount ? parseInt(viewCount).toLocaleString() : '';
  
  // Format like count with commas
  const formattedLikeCount = likeCount ? parseInt(likeCount).toLocaleString() : '';

  return (
    <div className="w-full p-6 mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6">
        {thumbnailUrl && (
          <div className="flex-shrink-0 aspect-video w-full md:w-64 h-auto relative overflow-hidden rounded-md">
            {videoUrl ? (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                <Image 
                  src={thumbnailUrl} 
                  alt={title || "Video thumbnail"} 
                  width={640}
                  height={360}
                  className="object-cover"
                />
              </a>
            ) : (
              <Image 
                src={thumbnailUrl} 
                alt={title || "Video thumbnail"} 
                width={640}
                height={360}
                className="object-cover"
              />
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
            <h2 className="text-xl font-bold break-words flex-1">
              {videoUrl ? (
                <a 
                  href={videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {title}
                </a>
              ) : (
                title
              )}
            </h2>
            <button
              onClick={(e) => {
                e.preventDefault();
                onTranscriptRequest();
              }}
              disabled={isLoading || isProcessing}
              className="shrink-0 px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Loading..." : isProcessing ? "Processing..." : "Get Transcript"}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
            {channelTitle && (
              <span className="break-words">
                {channelUrl ? (
                  <a 
                    href={channelUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {channelTitle}
                  </a>
                ) : (
                  channelTitle
                )}
              </span>
            )}
            {formattedDate && <span>• {formattedDate}</span>}
            {formattedViewCount && <span>• {formattedViewCount} views</span>}
            {formattedLikeCount && <span>• {formattedLikeCount} likes</span>}
          </div>
          
          {description && (
            <div className="mt-3">
              <div className={`text-sm text-gray-700 dark:text-gray-300 break-words ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {description}
              </div>
              {description.length > 150 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 