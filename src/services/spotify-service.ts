
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

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_urls: {
    spotify: string;
  };
  preview_url?: string | null;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrackItem[];
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
  limit: number = 5,
  offset: number = 0 // Spotify recommendations endpoint does not directly support offset.
): Promise<{ songs: Song[]; total: number }> {
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams();

  if (params.seed_artists && params.seed_artists.length > 0) {
    queryParams.append('seed_artists', params.seed_artists.slice(0, 5).join(','));
  }
  if (params.seed_genres && params.seed_genres.length > 0) {
    // Ensure genres are valid before appending
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

  if (totalSeeds === 0 && !params.fallbackSearchQuery) {
     console.warn("No seeds provided for Spotify recommendations and no fallback query.");
     return { songs: [], total: 0 };
  }
  if (totalSeeds === 0 && params.fallbackSearchQuery) { // If no seeds but fallback exists, it should be handled by searchSpotifyTracksService
    console.warn("No seeds, should use fallback search. This path in getSpotifyRecommendationsService implies an issue in action logic.");
    return { songs: [], total: 0 };
  }


  if (params.target_danceability) queryParams.append('target_danceability', params.target_danceability.toString());
  if (params.target_energy) queryParams.append('target_energy', params.target_energy.toString());
  if (params.target_tempo) queryParams.append('target_tempo', params.target_tempo.toString());
  if (params.target_valence) queryParams.append('target_valence', params.target_valence.toString());
  if (params.target_instrumentalness) queryParams.append('target_instrumentalness', params.target_instrumentalness.toString());
  
  queryParams.append('limit', limit.toString());
  // Note: offset is not directly supported by recommendations.
  // The calling action should handle pagination logic if needed by adjusting seeds or caching.

  const response = await fetch(`${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify Recommendations API Error:', response.status, errorBody, queryParams.toString());
    throw new Error(`Spotify API recommendations failed: ${response.statusText}`);
  }

  const data: SpotifyRecommendationsResponse = await response.json();
  const songs = data.tracks.map(mapSpotifyItemToSong);
  
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

  const response = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(queryString)}&type=track&market=US&limit=${limit}&offset=${offset}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Spotify API Search Error:', response.status, errorBody);
    throw new Error(`Spotify API track search failed: ${response.statusText}`);
  }

  const data: SpotifySearchResponse = await response.json();
  const songs = data.tracks.items.map(mapSpotifyItemToSong);

  return { songs, total: data.tracks.total };
}
