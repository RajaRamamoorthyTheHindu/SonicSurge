
// src/services/youtube-service.ts
'use server';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

// Cache for YouTube video ID lookups
interface YouTubeCacheEntry {
  videoId: string | null;
  timestamp: number;
}
const youtubeCache = new Map<string, YouTubeCacheEntry>();
const YOUTUBE_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

export async function searchYouTubeVideo(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY') {
    console.error('YouTube API key not configured or using placeholder value.');
    // Potentially throw an error or return null, depending on how you want to handle this in the UI
    return null; 
  }

  if (!query || !query.trim()) {
    console.warn('YouTube search query is empty.');
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const now = Date.now();

  // Check cache
  const cachedEntry = youtubeCache.get(normalizedQuery);
  if (cachedEntry && (now - cachedEntry.timestamp < YOUTUBE_CACHE_DURATION)) {
    console.log(`Returning cached YouTube videoId for query: "${normalizedQuery}"`);
    return cachedEntry.videoId;
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    q: query, // Use original query for search, normalized for cache key
    type: 'video',
    maxResults: '1',
  });

  const searchUrl = `${YOUTUBE_API_BASE}?${params.toString()}`;
  console.log(`Searching YouTube with URL: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('YouTube API Search Error:', response.status, errorBody);
      // Do not cache on error
      return null;
    }

    const data: YouTubeSearchResponse = await response.json();
    const videoId = data.items && data.items.length > 0 ? data.items[0].id.videoId : null;

    // Store in cache
    youtubeCache.set(normalizedQuery, { videoId, timestamp: now });
    console.log(`Fetched and cached YouTube videoId: ${videoId} for query: "${normalizedQuery}"`);
    
    return videoId;

  } catch (error) {
    console.error('Error fetching or parsing YouTube search results:', (error as Error).message, error);
    return null;
  }
}
