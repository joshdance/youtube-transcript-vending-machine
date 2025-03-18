import Image from 'next/image';
import { useState } from 'react';
import { Calendar, Clock, Eye, ThumbsUp } from 'lucide-react';

export default function VideoMetadata({ metadata, videoUrl, onTranscriptRequest, isLoading, isProcessing }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
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
    duration,
  } = metadata;

  // Create YouTube channel URL from channel ID
  const channelUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : null;

  // Format date
  const formattedDate = publishedAt ? new Date(publishedAt).toLocaleDateString() : '';
  
  // Format view count with commas
  const formattedViewCount = viewCount ? parseInt(viewCount).toLocaleString() : '';
  
  // Format like count with commas
  const formattedLikeCount = likeCount ? parseInt(likeCount).toLocaleString() : '';

  // Extract video ID from URL
  const videoId = videoUrl ? new URL(videoUrl).searchParams.get('v') : null;

  // Handle thumbnail click
  const handleThumbnailClick = (e) => {
    e.preventDefault();
    setIsEmbedded(!isEmbedded);
  };

  // Handle thumbnail download
  const handleThumbnailDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!thumbnailUrl) return;

    try {
      // Fetch the image data
      const response = await fetch(thumbnailUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title || 'thumbnail'}.jpg`;
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
    }
  };

  return (
    <div className="w-full p-6 mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6">
        {thumbnailUrl && (
          <div 
            className="flex-shrink-0 aspect-video w-full md:w-64 h-auto relative overflow-hidden rounded-md group"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {videoUrl ? (
              <div onClick={handleThumbnailClick} className="cursor-pointer">
                {isEmbedded ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title={title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
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
            ) : (
              <Image 
                src={thumbnailUrl} 
                alt={title || "Video thumbnail"} 
                width={640}
                height={360}
                className="object-cover"
              />
            )}
            {isHovering && !isEmbedded && (
              <button
                onClick={handleThumbnailDownload}
                className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md transition-colors"
                title="Download thumbnail"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
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
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {formattedDate}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {duration}
              </span>
            )}
            {formattedViewCount && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {formattedViewCount} views
              </span>
            )}
            {formattedLikeCount && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" /> {formattedLikeCount} likes
              </span>
            )}
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