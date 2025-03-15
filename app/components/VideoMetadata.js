import Image from 'next/image';

export default function VideoMetadata({ metadata, videoUrl }) {
  if (!metadata) return null;

  const {
    title,
    channelTitle,
    publishedAt,
    viewCount,
    likeCount,
    description,
    thumbnailUrl,
  } = metadata;

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
            <Image 
              src={thumbnailUrl} 
              alt={title || "Video thumbnail"} 
              width={640}
              height={360}
              className="object-cover"
            />
          </div>
        )}
        
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">
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
          
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
            {channelTitle && <span>{channelTitle}</span>}
            {formattedDate && <span>• {formattedDate}</span>}
            {formattedViewCount && <span>• {formattedViewCount} views</span>}
            {formattedLikeCount && <span>• {formattedLikeCount} likes</span>}
          </div>
          
          {description && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 