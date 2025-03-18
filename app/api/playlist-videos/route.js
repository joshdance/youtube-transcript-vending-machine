import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get('playlistId');
  
  if (!playlistId) {
    return NextResponse.json(
      { error: 'Missing playlist ID' },
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
    const videos = [];
    let nextPageToken = null;
    
    do {
      // Fetch playlist items
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&key=${apiKey}`;
      const playlistResponse = await fetch(playlistUrl);
      const playlistData = await playlistResponse.json();
      
      if (!playlistResponse.ok) {
        throw new Error(`YouTube API error: ${playlistData.error?.message || 'Unknown error'}`);
      }
      
      // Extract video IDs
      const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).join(',');
      
      // Fetch detailed video information
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`;
      const videosResponse = await fetch(videosUrl);
      const videosData = await videosResponse.json();
      
      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosData.error?.message || 'Unknown error'}`);
      }
      
      // Process video data
      const processedVideos = videosData.items.map(item => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        viewCount: item.statistics.viewCount,
        likeCount: item.statistics.likeCount,
        commentCount: item.statistics.commentCount,
      }));
      
      videos.push(...processedVideos);
      
      // Get next page token if available
      nextPageToken = playlistData.nextPageToken;
    } while (nextPageToken);
    
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    return NextResponse.json(
      { error: `Failed to fetch playlist videos: ${error.message}` },
      { status: 500 }
    );
  }
} 