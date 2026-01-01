/**
 * Validates and parses a YouTube URL to extract video or playlist information
 * @param {string} url - The URL to validate
 * @returns {Object} An object containing validation results and extracted IDs
 */
export const isValidYouTubeUrl = (url) => {
  console.log('[YouTube] Validating URL:', url);
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    console.log('[YouTube] Parsed hostname:', hostname, 'pathname:', urlObj.pathname);
    
    // Check for youtube.com or youtu.be domains
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return { isValid: false, type: 'invalid', message: 'Not a YouTube URL' };
    }

    if (hostname.includes('youtube.com')) {
      const pathname = urlObj.pathname;
      const hasPlaylistId = urlObj.searchParams.has('list');
      const isPlaylistPage = pathname === '/playlist';
      const hasVideoId = urlObj.searchParams.has('v');

      // Pure playlist URL
      if (isPlaylistPage && hasPlaylistId) {
        return { 
          isValid: true, 
          type: 'playlist',
          playlistId: urlObj.searchParams.get('list'),
          message: null 
        };
      }

      // Video within playlist
      if (hasVideoId && hasPlaylistId) {
        return { 
          isValid: true, 
          type: 'video_in_playlist',
          videoId: urlObj.searchParams.get('v'),
          playlistId: urlObj.searchParams.get('list'),
          message: null 
        };
      }

      // Standard video URL (watch?v=)
      if (hasVideoId) {
        return { 
          isValid: true, 
          type: 'video',
          videoId: urlObj.searchParams.get('v'),
          message: null 
        };
      }

      // Shorts URL (/shorts/<videoId>)
      if (pathname.startsWith('/shorts/')) {
        const videoId = pathname.split('/shorts/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) {
          return { 
            isValid: true, 
            type: 'video',
            videoId: videoId,
            message: null 
          };
        }
      }

      // Embed URL (/embed/<videoId>)
      if (pathname.startsWith('/embed/')) {
        const videoId = pathname.split('/embed/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) {
          return { 
            isValid: true, 
            type: 'video',
            videoId: videoId,
            message: null 
          };
        }
      }

      // Live URL (/live/<videoId>)
      if (pathname.startsWith('/live/')) {
        const videoId = pathname.split('/live/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) {
          return { 
            isValid: true, 
            type: 'video',
            videoId: videoId,
            message: null 
          };
        }
      }

      console.log('[YouTube] No valid format matched');
      return { isValid: false, type: 'invalid', message: 'Invalid YouTube URL format' };
    } else {
      // youtu.be links
      const videoId = urlObj.pathname.slice(1).split('?')[0];
      const result = { 
        isValid: videoId.length > 0,
        type: 'video',
        videoId: videoId,
        message: null
      };
      console.log('[YouTube] youtu.be result:', result);
      return result;
    }
  } catch (e) {
    console.log('[YouTube] URL parsing error:', e.message);
    return { isValid: false, type: 'invalid', message: 'Invalid URL format' };
  }
};

/**
 * Fetches metadata for a YouTube video or playlist
 * @param {string} url - The YouTube URL to fetch metadata for
 * @returns {Promise<Object>} Object containing metadata, playlist info, and type
 * @throws {Error} If the URL is invalid or the fetch fails
 */
export const fetchMetadata = async (url) => {
  if (!url) {
    return {
      videoMetadata: null,
      playlistVideos: null,
      isPlaylist: false
    };
  }

  // Validate URL
  const urlValidation = isValidYouTubeUrl(url);
  
  if (!urlValidation.isValid) {
    throw new Error(urlValidation.message || "Please enter a valid YouTube URL");
  }

  try {
    if (urlValidation.type === 'playlist' || urlValidation.type === 'video_in_playlist') {
      // Check if this is a Watch Later playlist
      if (urlValidation.playlistId === 'WL') {
        // Fetch single video metadata
        const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch video metadata");
        }
        
        return {
          videoMetadata: data.metadata,
          playlistVideos: null,
          isPlaylist: false  // Treat as single video
        };
      }
      
      // Fetch playlist videos
      const playlistResponse = await fetch(`/api/playlist-videos?playlistId=${urlValidation.playlistId}`);
      const playlistData = await playlistResponse.json();
      
      if (!playlistResponse.ok) {
        throw new Error(playlistData.error || "Failed to fetch playlist videos");
      }

      // For video_in_playlist, also fetch the video metadata
      let videoMetadata = null;
      if (urlValidation.type === 'video_in_playlist' && urlValidation.videoId) {
        try {
          const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          
          if (response.ok) {
            videoMetadata = data.metadata;
          }
        } catch (err) {
          console.error('Error fetching video metadata:', err);
        }
      }
      
      return {
        videoMetadata,
        playlistVideos: playlistData.videos,
        isPlaylist: true
      };
    } else {
      // Fetch single video metadata
      const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch video metadata");
      }
      
      return {
        videoMetadata: data.metadata,
        playlistVideos: null,
        isPlaylist: false
      };
    }
  } catch (err) {
    throw new Error(err.message || "Failed to fetch metadata");
  }
};
