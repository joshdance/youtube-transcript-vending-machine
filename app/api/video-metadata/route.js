import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  console.log('Video metadata request for URL:', videoUrl);
  
  if (!videoUrl) {
    console.log('Missing URL parameter');
    return NextResponse.json(
      { error: 'Missing YouTube video URL' },
      { status: 400 }
    );
  }
  
  // Extract video ID from YouTube URL
  let videoId;
  try {
    const url = new URL(videoUrl);
    console.log('Parsed URL:', {
      hostname: url.hostname,
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams)
    });
    
    if (url.hostname.includes('youtube.com')) {
      // Regular youtube.com URL - get video ID from 'v' parameter
      videoId = url.searchParams.get('v');
      console.log('Extracted video ID from youtube.com URL:', videoId);
    } else if (url.hostname.includes('youtu.be')) {
      // Short youtu.be URL - get video ID from pathname
      videoId = url.pathname.slice(1).split('?')[0]; // Remove any query parameters
      console.log('Extracted video ID from youtu.be URL:', videoId);
    }
    
    if (!videoId) {
      console.error('Could not extract video ID');
      throw new Error('Could not extract video ID from URL');
    }
  } catch (error) {
    console.error('Error parsing URL:', error);
    return NextResponse.json(
      { error: 'Invalid YouTube URL: ' + error.message },
      { status: 400 }
    );
  }
  
  // Get API key from environment variable
  const apiKey = process.env.YOUTUBE_DATA_v3_KEY;
  if (!apiKey) {
    console.error('YouTube API key not configured');
    return NextResponse.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }
  
  try {
    // Fetch video details
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`;
    console.log('Fetching from YouTube API:', apiUrl);
    
    const videoResponse = await fetch(apiUrl);
    const videoData = await videoResponse.json();
    console.log('YouTube API response:', videoData);
    
    if (!videoResponse.ok) {
      console.error('YouTube API error:', videoData.error);
      throw new Error(`YouTube API error: ${videoData.error?.message || 'Unknown error'}`);
    }
    
    if (!videoData.items || videoData.items.length === 0) {
      console.error('Video not found');
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    const item = videoData.items[0];
    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    const contentDetails = item.contentDetails || {};
    
    // Format duration from ISO 8601 to MM:SS
    const formatDuration = (duration) => {
      if (!duration) return '';
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (!match) return '';
      
      const hours = (match[1] || '').replace('H', '');
      const minutes = (match[2] || '').replace('M', '');
      const seconds = (match[3] || '').replace('S', '');
      
      if (hours) {
        return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.padStart(2, '0')}`;
    };
    
    // Extract the metadata we need
    const metadata = {
      title: snippet.title,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
      channelId: snippet.channelId,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
      viewCount: statistics.viewCount,
      likeCount: statistics.likeCount,
      commentCount: statistics.commentCount,
      duration: formatDuration(contentDetails.duration),
    };
    
    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return NextResponse.json(
      { error: `Failed to fetch video metadata: ${error.message}` },
      { status: 500 }
    );
  }
} 