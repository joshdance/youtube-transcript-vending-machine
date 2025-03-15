import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  
  if (!videoUrl) {
    return NextResponse.json(
      { error: 'Missing YouTube video URL' },
      { status: 400 }
    );
  }
  
  // Extract video ID from YouTube URL
  let videoId;
  try {
    const url = new URL(videoUrl);
    
    if (url.hostname.includes('youtube.com')) {
      // Regular youtube.com URL
      videoId = url.searchParams.get('v');
    } else if (url.hostname.includes('youtu.be')) {
      // Short youtu.be URL
      videoId = url.pathname.slice(1);
    }
    
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid YouTube URL: ' + error.message },
      { status: 400 }
    );
  }
  
  // Get API key from environment variable
  const apiKey = process.env.YOUTUBE_DATA_v3_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }
  
  try {
    // Fetch video details
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${apiKey}`
    );
    
    const videoData = await videoResponse.json();
    
    if (!videoResponse.ok) {
      throw new Error(`YouTube API error: ${videoData.error?.message || 'Unknown error'}`);
    }
    
    if (!videoData.items || videoData.items.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    const item = videoData.items[0];
    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    
    // Extract the metadata we need
    const metadata = {
      title: snippet.title,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
      viewCount: statistics.viewCount,
      likeCount: statistics.likeCount,
      commentCount: statistics.commentCount,
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