
// src/services/spotify-service.ts
import type { Song } from '@/types';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent'; // Will be used for recommendation params

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

interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  tempo: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
}

export interface SpotifyTrackDetails {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumArtUrl?: string;
  energy?: number;
  danceability?: number;
  tempo?: number;
  valence?: number;
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


export async function getSpotifyTrackDetailsAndFeatures(trackId: string): Promise<SpotifyTrackDetails | null> {
  const token = await getClientCredentialsToken();
  
  try {
    const [trackResponse, featuresResponse] = await Promise.all([
      fetch(`${SPOTIFY_API_BASE}/tracks/${trackId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${SPOTIFY_API_BASE}/audio-features/${trackId}`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (!trackResponse.ok) {
      console.error(`Spotify Track API Error for ${trackId}:`, trackResponse.status, await trackResponse.text());
      return null;
    }
    const trackData: SpotifyTrackItem = await trackResponse.json();

    let featuresData: SpotifyAudioFeatures | null = null;
    if (featuresResponse.ok) {
      featuresData = await featuresResponse.json();
    } else {
      console.warn(`Spotify Audio Features API Error for ${trackId}:`, featuresResponse.status, await featuresResponse.text());
    }

    return {
      id: trackData.id,
      title: trackData.name,
      artist: trackData.artists[0]?.name || 'Unknown Artist',
      artistId: trackData.artists[0]?.id,
      album: trackData.album.name,
      albumArtUrl: trackData.album.images[0]?.url,
      energy: featuresData?.energy,
      danceability: featuresData?.danceability,
      tempo: featuresData?.tempo,
      valence: featuresData?.valence,
    };
  } catch (error) {
    console.error(`Error fetching details for Spotify track ${trackId}:`, error);
    return null;
  }
}


export async function getSpotifyRecommendationsService(
  params: InterpretMusicalIntentOutput,
  limit: number = 5,
  offset: number = 0 // Spotify recommendations endpoint does not directly support offset. We fetch more and slice if needed, or simplify for now.
                  // For true pagination with recommendations, a more complex strategy involving varying seeds or excluding already fetched tracks is needed.
                  // For this iteration, we'll fetch `limit` and ignore offset for recommendations, or fetch a larger set if offset is used.
                  // Let's assume offset is handled by fetching a larger initial set if needed by the calling action. For now, we'll use limit.
): Promise<{ songs: Song[]; total: number }> {
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams();

  if (params.seed_artists && params.seed_artists.length > 0) {
    queryParams.append('seed_artists', params.seed_artists.slice(0, 5).join(','));
  }
  if (params.seed_genres && params.seed_genres.length > 0) {
    queryParams.append('seed_genres', params.seed_genres.slice(0, 5).join(','));
  }
  if (params.seed_tracks && params.seed_tracks.length > 0) {
    queryParams.append('seed_tracks', params.seed_tracks.slice(0, 5).join(','));
  }

  // Ensure total seeds do not exceed 5
  const totalSeeds = (params.seed_artists?.length || 0) + (params.seed_genres?.length || 0) + (params.seed_tracks?.length || 0);
  if (totalSeeds === 0 && !params.fallbackSearchQuery) { // if no seeds and no fallback, throw error or return empty
     console.warn("No seeds provided for Spotify recommendations.");
     return { songs: [], total: 0 };
  }


  if (params.target_danceability) queryParams.append('target_danceability', params.target_danceability.toString());
  if (params.target_energy) queryParams.append('target_energy', params.target_energy.toString());
  if (params.target_tempo) queryParams.append('target_tempo', params.target_tempo.toString());
  if (params.target_valence) queryParams.append('target_valence', params.target_valence.toString());
  
  queryParams.append('limit', limit.toString());
  // Note: offset is not directly supported by recommendations.
  // If offset > 0, we'd need to fetch limit+offset and slice, or have a more complex caching/deduplication strategy.
  // For now, if offset is used, it will effectively re-fetch similar recommendations unless seeds change.
  // A simple approach for pagination here might be to just fetch 'limit' songs each time.

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
  
  // The recommendations endpoint doesn't give a 'total' in the same way search does.
  // It gives up to 'limit' tracks based on seeds.
  // We can assume 'total' is effectively the number of songs returned, or a larger arbitrary number if we want to enable 'load more' once.
  // For simplicity with 'load more', let's say if we get 'limit' songs, there might be more.
  const total = songs.length === limit ? songs.length + limit : songs.length; // Simplified total for pagination UI

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
