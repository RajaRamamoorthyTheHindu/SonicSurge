
// src/services/spotify-service.ts
import type { Song } from '@/types';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

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
  tokenExpiryTime = Date.now() + (tokenData.expires_in - 60) * 1000;
  
  return accessToken!;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  genres?: string[]; // Optional, but useful
  popularity?: number; // Optional
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
  tracks?: { // If searching for tracks
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
  artists?: { // If searching for artists
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

interface SpotifyAvailableGenreSeedsResponse {
  genres: string[];
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
  // _offset parameter removed as it's not used by Spotify recommendations and caused lint error
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

  const totalSeeds = (params.seed_artists?.length || 0) + 
                     (params.seed_genres?.filter(g => typeof g === 'string' && g.trim() !== '').length || 0) + 
                     (params.seed_tracks?.length || 0);
  
  if (totalSeeds === 0) {
     // If no seeds, we rely on the fallbackSearchQuery, which should be handled by searchSpotifyTracksService.
     // This function (getSpotifyRecommendationsService) should ideally not be called if there are no seeds.
     console.warn("No seeds provided for Spotify recommendations. This suggests an issue in the calling logic if fallbackSearchQuery was not used instead.");
     return { songs: [], total: 0 };
  }
  // Spotify API requires at least one seed if recommendations endpoint is used.
  // The sum of seeds (artists, genres, tracks) cannot exceed 5. This should be enforced by the AI prompt.

  if (params.target_danceability) queryParams.append('target_danceability', params.target_danceability.toString());
  if (params.target_energy) queryParams.append('target_energy', params.target_energy.toString());
  if (params.target_tempo) queryParams.append('target_tempo', params.target_tempo.toString());
  if (params.target_valence) queryParams.append('target_valence', params.target_valence.toString());
  if (params.target_instrumentalness) queryParams.append('target_instrumentalness', params.target_instrumentalness.toString());
  
  queryParams.append('limit', limit.toString());
  // Note: offset is not directly supported by recommendations.
  
  console.log(`Fetching Spotify recommendations with query: ${queryParams.toString()}`);
  const response = await fetch(`${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify Recommendations API Error:', response.status, errorBody, queryParams.toString());
    throw new Error(`Spotify API recommendations failed: ${response.statusText} - ${errorBody}`);
  }

  const data: SpotifyRecommendationsResponse = await response.json();
  const songs = data.tracks.map(mapSpotifyItemToSong);
  
  // The recommendations endpoint doesn't provide a 'total'. 
  // We estimate it based on whether we received the full limit.
  // This is a simplification for pagination and might not be perfectly accurate.
  const total = songs.length === limit ? songs.length + limit : songs.length; 

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
    market: 'US', // Consider making market configurable or inferring from user
    limit: limit.toString(),
    offset: offset.toString(),
  });

  console.log(`Searching Spotify tracks with query: ${queryParams.toString()}`);
  const response = await fetch(`${SPOTIFY_API_BASE}/search?${queryParams.toString()}`, {
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
  limit: number = 1 // Typically, we want the top match for seed generation
): Promise<SpotifyArtist[]> {
  if (!artistName.trim()) {
    console.warn("Spotify artist search query is empty.");
    return [];
  }
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams({
    q: artistName,
    type: 'artist',
    limit: limit.toString(),
  });

  console.log(`Searching Spotify artists with query: ${queryParams.toString()}`);
  const response = await fetch(`${SPOTIFY_API_BASE}/search?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Artist Search Error:', response.status, errorBody);
    // Do not throw, let AI tool handle empty/error response gracefully
    return []; 
  }
  const data: SpotifySearchResponse<SpotifyArtist> = await response.json();
  return data.artists?.items || [];
}


export async function searchSpotifyTrackService(
  trackName: string,
  artistName?: string,
  limit: number = 1 // Typically, we want the top match for seed generation
): Promise<SpotifyTrackItem[]> {
   if (!trackName.trim()) {
    console.warn("Spotify track search query is empty.");
    return [];
  }
  const token = await getClientCredentialsToken();
  let query = `track:${trackName}`;
  if (artistName && artistName.trim()) {
    query += ` artist:${artistName}`;
  }

  const queryParams = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });
  
  console.log(`Searching Spotify track with query: ${queryParams.toString()}`);
  const response = await fetch(`${SPOTIFY_API_BASE}/search?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Track Detail Search Error:', response.status, errorBody);
     // Do not throw, let AI tool handle empty/error response gracefully
    return [];
  }
  const data: SpotifySearchResponse<SpotifyTrackItem> = await response.json();
  return data.tracks?.items || [];
}


export async function getAvailableGenreSeeds(): Promise<string[]> {
  const token = await getClientCredentialsToken();
  const response = await fetch(`${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Available Genre Seeds Error:', response.status, errorBody);
    // Do not throw, let AI tool handle empty/error response gracefully
    return [];
  }
  const data: SpotifyAvailableGenreSeedsResponse = await response.json();
  return data.genres || [];
}
