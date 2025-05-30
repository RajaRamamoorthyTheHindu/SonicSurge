
// src/services/spotify-service.ts
import type { Song } from '@/types';
// import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent'; // No longer needed here

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

let availableGenresCache: string[] | null = null;
let genresCacheTimestamp: number | null = null;
const GENRES_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface ArtistCacheEntry {
  artists: SpotifyArtist[];
  timestamp: number;
}
const artistCache = new Map<string, ArtistCacheEntry>();
const ARTIST_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours


async function getClientCredentialsToken(): Promise<string> {
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'YOUR_SPOTIFY_CLIENT_ID' || clientSecret === 'YOUR_SPOTIFY_CLIENT_SECRET') {
    console.error('spotify-service: Spotify client ID or secret not configured or using placeholder values.');
    throw new Error('Spotify API credentials missing or invalid. Please update your .env file.');
  }
  console.log("spotify-service: Fetching new Spotify client credentials token.");
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify Token Error: ${response.status} ${response.statusText}. Response: ${errorBody}`);
    accessToken = null;
    tokenExpiryTime = null;
    throw new Error(`Failed to retrieve Spotify access token: ${response.statusText}`);
  }

  const tokenData = await response.json();
  accessToken = tokenData.access_token;
  tokenExpiryTime = Date.now() + (tokenData.expires_in - 60) * 1000; // 60s buffer
  console.log("spotify-service: Successfully fetched and cached new Spotify token.");
  return accessToken!;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  genres?: string[];
  popularity?: number;
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  album_type: string;
  release_date: string;
}

export interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_urls: {
    spotify: string;
  };
  preview_url?: string | null;
  popularity?: number;
  duration_ms?: number;
}

interface SpotifySearchResponse<T extends SpotifyTrackItem | SpotifyArtist> {
  tracks?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
  artists?: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
}

/*
// The /v1/recommendations endpoint is assumed to be deprecated based on user information.
// This function is no longer used.
//
export async function getSpotifyRecommendationsService(
  params: InterpretMusicalIntentOutput, // This type would need to be adjusted if used
  limit: number = 5
): Promise<{ songs: Song[]; total: number }> {
  console.log("spotify-service: getSpotifyRecommendationsService called with params:", JSON.stringify(params), "limit:", limit);
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());

  let seedCount = 0;
  let hasTargets = false;

  // Validate and append seeds (example structure, would depend on updated InterpretMusicalIntentOutput)
  // if (params.seed_artists && params.seed_artists.length > 0) { ... }
  // if (params.seed_genres && params.seed_genres.length > 0) { ... }
  // if (params.seed_tracks && params.seed_tracks.length > 0) { ... }
  
  // Validate and append target audio features (example structure)
  // const targetParamsValidators: { ... } = { ... };
  // for (const key in params) {
  //   if (key.startsWith('target_')) { ... hasTargets = true; ... }
  // }


  if (seedCount === 0 && !hasTargets) {
    console.warn("spotify-service: (Recommendations) No valid seeds and no target parameters provided. Returning empty results.");
    return { songs: [], total: 0 };
  }
  
  const recommendationsUrl = `${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`;
  console.log(`spotify-service: (Recommendations) Fetching Spotify recommendations with URL: ${recommendationsUrl}`);

  const response = await fetch(recommendationsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`spotify-service: (Recommendations) API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: (Recommendations) Spotify API Error: ${response.status} ${response.statusText}. Query: ${recommendationsUrl}. Response: ${errorBody}`);
    if (response.status === 400) {
        console.error("spotify-service: (Recommendations) Spotify API returned 400 Bad Request. This often means seeds or target parameters were invalid.");
    }
    return { songs: [], total: 0 };
  }

  const data: { tracks: SpotifyTrackItem[] } = await response.json(); // Simplified response type
  const tracks = data.tracks || [];
  const songs = tracks.map(mapSpotifyItemToSong);

  console.log(`spotify-service: (Recommendations) Received ${songs.length} tracks. Raw tracks count: ${tracks.length}`);
  const total = songs.length === limit && songs.length > 0 ? songs.length + limit : songs.length;
  return { songs, total };
}
*/

function mapSpotifyItemToSong(item: SpotifyTrackItem): Song {
    const albumArt = item.album.images[0]?.url;
    const artistName = item.artists[0]?.name || 'Unknown Artist';
    const albumName = item.album.name || 'Unknown Album';

    let hint = '';
    if (artistName !== 'Unknown Artist') {
      hint += artistName.split(' ')[0];
    }
    if (albumName !== 'Unknown Album') {
      hint += (hint ? ' ' : '') + albumName.split(' ')[0];
    }

    return {
      id: item.id,
      songTitle: item.name,
      artistName: artistName,
      albumName: albumName,
      albumArtUrl: albumArt || `https://placehold.co/400x400.png`,
      platformLinks: {
        spotify: item.external_urls.spotify,
      },
      aiHint: albumArt ? undefined : (hint.split(' ').slice(0,2).join(' ') || 'music album'),
    };
}


export async function searchSpotifyTracksService(
  queryString: string,
  limit: number = 5,
  offset: number = 0
): Promise<{ songs: Song[]; total: number }> {
  console.log("spotify-service: searchSpotifyTracksService called with query:", queryString, "limit:", limit, "offset:", offset);
  if (!queryString || !queryString.trim()) {
    console.warn("spotify-service: Spotify search query is empty. Returning no results.");
    return { songs: [], total: 0 };
  }

  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams({
    q: queryString.trim(),
    type: 'track',
    market: 'US', // Consider making market configurable or omitting for broader results
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`spotify-service: Searching Spotify tracks with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`spotify-service: Track Search API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify API Track Search Error: ${response.status} ${response.statusText}. Query: ${searchUrl}. Response: ${errorBody}`);
    if (response.status === 400) {
        console.error("spotify-service: Spotify API returned 400 Bad Request for search. This might mean the query string was malformed.");
    }
    return { songs: [], total: 0 };
  }

  const data: SpotifySearchResponse<SpotifyTrackItem> = await response.json();
  const items = data.tracks?.items || [];
  const songs = items.map(mapSpotifyItemToSong);
  const totalFromServer = data.tracks?.total || 0;

  if (songs.length === 0 && totalFromServer > 0) {
     console.log(`spotify-service: Received 0 tracks from Spotify search for this page (offset: ${offset}), but total available is ${totalFromServer}.`);
  } else if (songs.length === 0) {
     console.log(`spotify-service: Received 0 tracks from Spotify search, and total available is 0.`);
  } else {
    console.log(`spotify-service: Received ${songs.length} tracks from Spotify search, total available: ${totalFromServer}.`);
  }

  return { songs, total: totalFromServer };
}

export async function searchSpotifyArtistsService(
  artistName: string,
  limit: number = 1
): Promise<SpotifyArtist[]> {
  const normalizedArtistName = artistName.trim().toLowerCase().replace(/\s\s+/g, ' ');
  if (!normalizedArtistName) {
    console.warn("spotify-service: Normalized Spotify artist search query is empty. Returning empty array.");
    return [];
  }

  const now = Date.now();
  const cachedEntry = artistCache.get(normalizedArtistName);
  if (cachedEntry && (now - cachedEntry.timestamp < ARTIST_CACHE_DURATION)) {
    console.log(`spotify-service: Returning cached Spotify artist data for: "${normalizedArtistName}"`);
    return cachedEntry.artists;
  }

  console.log(`spotify-service: Searching Spotify for artist (normalized): "${normalizedArtistName}" (original: "${artistName}")`);
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams({
    q: `artist:"${normalizedArtistName}"`, 
    type: 'artist',
    limit: limit.toString(),
  });

  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`spotify-service: Searching Spotify artists with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`spotify-service: Artist Search API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify API Artist Search Error: ${response.status} ${response.statusText}. Query: ${searchUrl}. Response: ${errorBody}`);
    return [];
  }
  const data: SpotifySearchResponse<SpotifyArtist> = await response.json();
  const artists = data.artists?.items || [];

  artistCache.set(normalizedArtistName, { artists, timestamp: now });
  console.log(`spotify-service: Fetched and cached ${artists.length} artists for: "${normalizedArtistName}"`);

  return artists;
}


export async function searchSpotifyTrackService(
  trackName: string,
  artistName?: string,
  limit: number = 1
): Promise<SpotifyTrackItem[]> {
   if (!trackName || !trackName.trim()) {
    console.warn("spotify-service: Spotify track search query (trackName) is empty. Returning empty array.");
    return [];
  }
  const token = await getClientCredentialsToken();
  let query = `track:${trackName.trim()}`;
  if (artistName && artistName.trim()) {
    const normalizedArtistName = artistName.trim().toLowerCase().replace(/\s\s+/g, ' ');
    query += ` artist:"${normalizedArtistName}"`; 
  }

  const queryParams = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });

  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`spotify-service: Searching Spotify track details with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`spotify-service: Track Detail Search API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify API Track Detail Search Error: ${response.status} ${response.statusText}. Query: ${searchUrl}. Response: ${errorBody}`);
    return [];
  }
  const data: SpotifySearchResponse<SpotifyTrackItem> = await response.json();
  const items = data.tracks?.items || [];
  console.log(`spotify-service: Found ${items.length} tracks for detail search.`);
  return items;
}


export async function getAvailableGenreSeeds(): Promise<string[]> {
  const now = Date.now();
  if (availableGenresCache && genresCacheTimestamp && (now - genresCacheTimestamp < GENRES_CACHE_DURATION)) {
    console.log("spotify-service: Returning cached Spotify genre seeds.");
    return availableGenresCache;
  }

  console.log("spotify-service: Fetching fresh Spotify genre seeds.");
  const token = await getClientCredentialsToken();
  const genresUrl = `${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`;
  console.log(`spotify-service: Fetching available Spotify genre seeds from URL: ${genresUrl}`);
  const response = await fetch(genresUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`spotify-service: Available Genre Seeds API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify API Available Genre Seeds Error: ${response.status} ${response.statusText}. Response: ${errorBody}`);
    return availableGenresCache || []; 
  }
  const data: { genres: string[] } = await response.json();
  availableGenresCache = data.genres || [];
  genresCacheTimestamp = now;
  console.log(`spotify-service: Fetched and cached ${availableGenresCache.length} genre seeds.`);
  return availableGenresCache;
}
