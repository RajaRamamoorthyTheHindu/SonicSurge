
// src/services/spotify-service.ts
import type { Song } from '@/types';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

// Cache for available genre seeds
let availableGenresCache: string[] | null = null;
let genresCacheTimestamp: number | null = null;
const GENRES_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

// Cache for artist lookups
interface ArtistCacheEntry {
  artists: SpotifyArtist[];
  timestamp: number;
}
const artistCache = new Map<string, ArtistCacheEntry>();
const ARTIST_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds


async function getClientCredentialsToken(): Promise<string> {
  if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'YOUR_SPOTIFY_CLIENT_ID' || clientSecret === 'YOUR_SPOTIFY_CLIENT_SECRET') {
    console.error('Spotify client ID or secret not configured or using placeholder values.');
    throw new Error('Spotify API credentials missing or invalid. Please update your .env file.');
  }

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
    console.error('Spotify Token Error:', response.status, errorBody);
    accessToken = null;
    tokenExpiryTime = null;
    throw new Error(`Failed to retrieve Spotify access token: ${response.statusText}`);
  }

  const tokenData = await response.json();
  accessToken = tokenData.access_token;
  tokenExpiryTime = Date.now() + (tokenData.expires_in - 60) * 1000; // Subtract 60 seconds for buffer
  
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

interface SpotifyRecommendationsResponse {
    tracks: SpotifyTrackItem[];
    seeds: Array<{
        initialPoolSize: number;
        afterFilteringSize: number;
        afterRelinkingSize: number;
        id: string;
        type: string;
        href: string | null;
    }>;
}

// Helper to map SpotifyTrackItem to our Song type
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


export async function getSpotifyRecommendationsService(
  params: InterpretMusicalIntentOutput,
  limit: number = 5
): Promise<{ songs: Song[]; total: number }> {
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams();

  if (params.seed_artists && params.seed_artists.length > 0) {
    queryParams.append('seed_artists', params.seed_artists.slice(0, 5).join(','));
  }
  if (params.seed_genres && params.seed_genres.length > 0) {
    const validGenres = params.seed_genres.filter(g => typeof g === 'string' && g.trim() !== '');
    if (validGenres.length > 0) {
        queryParams.append('seed_genres', validGenres.slice(0, 5).join(','));
    }
  }
  if (params.seed_tracks && params.seed_tracks.length > 0) {
    queryParams.append('seed_tracks', params.seed_tracks.slice(0, 5).join(','));
  }

  const currentSeedArtists = queryParams.get('seed_artists')?.split(',').filter(s => s && s.trim() !== '') || [];
  const currentSeedGenres = queryParams.get('seed_genres')?.split(',').filter(g => g && g.trim() !== '') || [];
  const currentSeedTracks = queryParams.get('seed_tracks')?.split(',').filter(t => t && t.trim() !== '') || [];
  
  const totalSeeds = currentSeedArtists.length + currentSeedGenres.length + currentSeedTracks.length;
  const hasTargets = Object.keys(params).some(k => k.startsWith('target_') && params[k as keyof InterpretMusicalIntentOutput] !== undefined);

  if (totalSeeds === 0 && !hasTargets) {
    console.warn("No seeds and no target parameters provided for Spotify recommendations. Spotify will likely return an error. Returning empty results.");
    return { songs: [], total: 0 }; 
  }
  if (totalSeeds === 0 && hasTargets) {
    console.warn("Spotify recommendations called with target parameters but no seeds. Results may be broad or an error might occur from Spotify.");
  }


  if (params.target_danceability) queryParams.append('target_danceability', params.target_danceability.toString());
  if (params.target_energy) queryParams.append('target_energy', params.target_energy.toString());
  if (params.target_tempo) queryParams.append('target_tempo', params.target_tempo.toString());
  if (params.target_valence) queryParams.append('target_valence', params.target_valence.toString());
  if (params.target_instrumentalness) queryParams.append('target_instrumentalness', params.target_instrumentalness.toString());
  
  queryParams.append('limit', limit.toString());
  
  const recommendationsUrl = `${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`;
  console.log(`Fetching Spotify recommendations with URL: ${recommendationsUrl}`);
  const response = await fetch(recommendationsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify Recommendations API Error:', response.status, errorBody, `Query: ${queryParams.toString()}`);
    throw new Error(`Spotify API recommendations failed: ${response.statusText} - ${errorBody}`);
  }

  const data: SpotifyRecommendationsResponse = await response.json();
  const songs = data.tracks.map(mapSpotifyItemToSong);
  
  const total = songs.length === limit && songs.length > 0 ? songs.length + limit : songs.length; 

  return { songs, total };
}


export async function searchSpotifyTracksService(
  queryString: string,
  limit: number = 5,
  offset: number = 0
): Promise<{ songs: Song[]; total: number }> {
  if (!queryString.trim()) {
    console.warn("Spotify search query is empty. Returning no results.");
    return { songs: [], total: 0 };
  }

  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams({
    q: queryString,
    type: 'track',
    market: 'US', 
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`Searching Spotify tracks with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Track Search Error:', response.status, errorBody);
    throw new Error(`Spotify API track search failed: ${response.statusText} - ${errorBody}`);
  }

  const data: SpotifySearchResponse<SpotifyTrackItem> = await response.json();
  const songs = data.tracks?.items.map(mapSpotifyItemToSong) || [];

  return { songs, total: data.tracks?.total || 0 };
}

export async function searchSpotifyArtistsService(
  artistName: string,
  limit: number = 1 
): Promise<SpotifyArtist[]> {
  if (!artistName || !artistName.trim()) {
    console.warn("Spotify artist search query is empty.");
    return [];
  }

  const normalizedArtistName = artistName.trim().toLowerCase().replace(/\s\s+/g, ' ');
  const now = Date.now();

  const cachedEntry = artistCache.get(normalizedArtistName);
  if (cachedEntry && (now - cachedEntry.timestamp < ARTIST_CACHE_DURATION)) {
    console.log(`Returning cached Spotify artist data for: "${normalizedArtistName}"`);
    return cachedEntry.artists;
  }

  console.log(`Searching Spotify for artist (normalized): "${normalizedArtistName}" (original: "${artistName}")`);
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams({
    q: normalizedArtistName, 
    type: 'artist',
    limit: limit.toString(),
  });

  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`Searching Spotify artists with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Artist Search Error:', response.status, errorBody);
    return []; 
  }
  const data: SpotifySearchResponse<SpotifyArtist> = await response.json();
  const artists = data.artists?.items || [];

  artistCache.set(normalizedArtistName, { artists, timestamp: now });
  console.log(`Fetched and cached ${artists.length} artists for: "${normalizedArtistName}"`);
  
  return artists;
}


export async function searchSpotifyTrackService(
  trackName: string,
  artistName?: string,
  limit: number = 1 
): Promise<SpotifyTrackItem[]> {
   if (!trackName.trim()) {
    console.warn("Spotify track search query is empty.");
    return [];
  }
  const token = await getClientCredentialsToken();
  let query = `track:${trackName.trim()}`;
  if (artistName && artistName.trim()) {
    const normalizedArtistName = artistName.trim().toLowerCase().replace(/\s\s+/g, ' ');
    query += ` artist:${normalizedArtistName}`;
  }

  const queryParams = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });
  
  const searchUrl = `${SPOTIFY_API_BASE}/search?${queryParams.toString()}`;
  console.log(`Searching Spotify track with URL: ${searchUrl}`);
  const response = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Track Detail Search Error:', response.status, errorBody);
    return [];
  }
  const data: SpotifySearchResponse<SpotifyTrackItem> = await response.json();
  return data.tracks?.items || [];
}


export async function getAvailableGenreSeeds(): Promise<string[]> {
  const now = Date.now();
  if (availableGenresCache && genresCacheTimestamp && (now - genresCacheTimestamp < GENRES_CACHE_DURATION)) {
    console.log("Returning cached Spotify genre seeds.");
    return availableGenresCache;
  }

  console.log("Fetching fresh Spotify genre seeds.");
  const token = await getClientCredentialsToken();
  const genresUrl = `${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`;
  console.log(`Fetching available Spotify genre seeds from URL: ${genresUrl}`);
  const response = await fetch(genresUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Available Genre Seeds Error:', response.status, errorBody);
    return availableGenresCache || []; 
  }
  const data: { genres: string[] } = await response.json();
  availableGenresCache = data.genres || [];
  genresCacheTimestamp = now;
  console.log(`Fetched and cached ${availableGenresCache.length} genre seeds.`);
  return availableGenresCache;
}
