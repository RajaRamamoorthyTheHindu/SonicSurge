// src/services/spotify-service.ts
import type { Song } from '@/types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

let accessToken: string | null = null;
let tokenExpiryTime: number | null = null; // Stores timestamp (Date.now() + expiresInSeconds * 1000)

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
  // Spotify returns expires_in in seconds. Convert to ms and set future expiry time.
  // Subtract a small buffer (e.g., 60 seconds) to be safe.
  tokenExpiryTime = Date.now() + (tokenData.expires_in - 60) * 1000;
  
  return accessToken!;
}

interface SpotifyArtist {
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
  };
}

export async function searchSpotifyTracksService(
  queryString: string,
  limit: number = 5
): Promise<Song[]> {
  if (!queryString.trim()) {
    console.warn("Spotify search query is empty. Returning no results.");
    return [];
  }

  const token = await getClientCredentialsToken();

  const response = await fetch(`${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(queryString)}&type=track&limit=${limit}`, {
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

  return data.tracks.items.map(item => {
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
      // aiHint is for placeholder images. Max 2 words.
      aiHint: albumArt ? undefined : (hint.split(' ').slice(0,2).join(' ') || 'music album'),
      // previewUrl: item.preview_url, // Optional: if you want to add preview functionality later
    };
  });
}
