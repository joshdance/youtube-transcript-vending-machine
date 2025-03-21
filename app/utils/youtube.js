/**
 * Validates and parses a YouTube URL to extract video or playlist information
 * @param {string} url - The URL to validate
 * @returns {Object} An object containing validation results and extracted IDs
 */
export const isValidYouTubeUrl = (url) => {
  console.log('Validating URL:', url);
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    console.log('URL hostname:', hostname);
    
    // Check for youtube.com or youtu.be domains
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      console.log('Invalid domain - not YouTube');
      return { isValid: false, type: 'invalid', message: 'Not a YouTube URL' };
    }

    if (hostname.includes('youtube.com')) {
      const hasPlaylistId = urlObj.searchParams.has('list');
      const isPlaylistPage = urlObj.pathname === '/playlist';
      const hasVideoId = urlObj.searchParams.has('v');
      console.log('URL params:', {
        hasPlaylistId,
        isPlaylistPage,
        hasVideoId,
        videoId: urlObj.searchParams.get('v'),
        playlistId: urlObj.searchParams.get('list')
      });

      // Pure playlist URL
      if (isPlaylistPage && hasPlaylistId) {
        const result = { 
          isValid: true, 
          type: 'playlist',
          playlistId: urlObj.searchParams.get('list'),
          message: null 
        };
        console.log('Detected playlist URL:', result);
        return result;
      }

      // Video within playlist
      if (hasVideoId && hasPlaylistId) {
        const result = { 
          isValid: true, 
          type: 'video_in_playlist',
          videoId: urlObj.searchParams.get('v'),
          playlistId: urlObj.searchParams.get('list'),
          message: null 
        };
        console.log('Detected video in playlist:', result);
        return result;
      }

      // Single video
      if (hasVideoId) {
        const result = { 
          isValid: true, 
          type: 'video',
          videoId: urlObj.searchParams.get('v'),
          message: null 
        };
        console.log('Detected single video:', result);
        return result;
      }

      console.log('Invalid YouTube URL format');
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
      console.log('Detected youtu.be URL:', result);
      return result;
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
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
  console.log('Fetching metadata for URL:', url);
  
  if (!url) {
    console.log('No URL provided');
    return {
      videoMetadata: null,
      playlistVideos: null,
      isPlaylist: false
    };
  }

  // Validate URL
  const urlValidation = isValidYouTubeUrl(url);
  console.log('URL validation result:', urlValidation);
  
  if (!urlValidation.isValid) {
    console.error('Invalid URL:', urlValidation.message);
    throw new Error(urlValidation.message || "Please enter a valid YouTube URL");
  }

  try {
    if (urlValidation.type === 'playlist' || urlValidation.type === 'video_in_playlist') {
      // Check if this is a Watch Later playlist
      if (urlValidation.playlistId === 'WL') {
        console.log('Detected Watch Later playlist - treating as single video instead');
        // Fetch single video metadata
        const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        console.log('Video metadata API response:', data);
        
        if (!response.ok) {
          console.error('Video metadata API error:', data.error);
          throw new Error(data.error || "Failed to fetch video metadata");
        }
        
        return {
          videoMetadata: data.metadata,
          playlistVideos: null,
          isPlaylist: false  // Treat as single video
        };
      }
      
      console.log('Fetching playlist videos for playlistId:', urlValidation.playlistId);
      // Fetch playlist videos
      const playlistResponse = await fetch(`/api/playlist-videos?playlistId=${urlValidation.playlistId}`);
      const playlistData = await playlistResponse.json();
      console.log('Playlist API response:', playlistData);
      
      if (!playlistResponse.ok) {
        console.error('Playlist API error:', playlistData.error);
        throw new Error(playlistData.error || "Failed to fetch playlist videos");
      }

      // For video_in_playlist, also fetch the video metadata
      let videoMetadata = null;
      if (urlValidation.type === 'video_in_playlist' && urlValidation.videoId) {
        console.log('Also fetching metadata for video in playlist:', urlValidation.videoId);
        try {
          const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          console.log('Video metadata API response:', data);
          
          if (response.ok) {
            videoMetadata = data.metadata;
          } else {
            console.error('Failed to fetch video metadata:', data.error);
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
      console.log('Fetching single video metadata');
      // Fetch single video metadata
      const response = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      console.log('Video metadata API response:', data);
      
      if (!response.ok) {
        console.error('Video metadata API error:', data.error);
        throw new Error(data.error || "Failed to fetch video metadata");
      }
      
      return {
        videoMetadata: data.metadata,
        playlistVideos: null,
        isPlaylist: false
      };
    }
  } catch (err) {
    console.error('Error in fetchMetadata:', err);
    throw new Error(err.message || "Failed to fetch metadata");
  }
}; 