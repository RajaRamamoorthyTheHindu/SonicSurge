
// src/services/spotify-service.ts
import type { Song } from '@/types';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent';

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
  console.log("spotify-service: getSpotifyRecommendationsService called with params:", JSON.stringify(params), "limit:", limit);
  const token = await getClientCredentialsToken();
  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());

  let seedCount = 0;
  // Validate and append seeds
  if (params.seed_artists && params.seed_artists.length > 0) {
    const validArtists = params.seed_artists.filter(a => typeof a === 'string' && a.trim() !== '').slice(0, 5 - seedCount);
    if (validArtists.length > 0) {
      queryParams.append('seed_artists', validArtists.join(','));
      seedCount += validArtists.length;
    }
  }
  if (params.seed_genres && params.seed_genres.length > 0 && seedCount < 5) {
    const validGenres = params.seed_genres.filter(g => typeof g === 'string' && g.trim() !== '').slice(0, 5 - seedCount);
    if (validGenres.length > 0) {
      queryParams.append('seed_genres', validGenres.join(','));
      seedCount += validGenres.length;
    }
  }
  if (params.seed_tracks && params.seed_tracks.length > 0 && seedCount < 5) {
    const validTracks = params.seed_tracks.filter(t => typeof t === 'string' && t.trim() !== '').slice(0, 5 - seedCount);
    if (validTracks.length > 0) {
      queryParams.append('seed_tracks', validTracks.join(','));
      seedCount += validTracks.length;
    }
  }

  // Validate and append target audio features
  const targetParams: { [key: string]: { min: number; max: number } | { exactValues?: (number | string)[] } } = {
    target_acousticness: { min: 0, max: 1 },
    target_danceability: { min: 0, max: 1 },
    target_energy: { min: 0, max: 1 },
    target_instrumentalness: { min: 0, max: 1 },
    target_liveness: { min: 0, max: 1 },
    target_loudness: { min: -60, max: 0 }, // Example range, Spotify's actual effective range might vary
    target_mode: { exactValues: [0, 1] },
    target_popularity: { min: 0, max: 100 }, // Integer
    target_speechiness: { min: 0, max: 1 },
    target_tempo: { min: 40, max: 240 }, // Example BPM range
    target_time_signature: { min: 3, max: 7 }, // Common time signatures
    target_valence: { min: 0, max: 1 },
  };

  let hasTargets = false;
  for (const key in params) {
    if (key.startsWith('target_')) {
      const typedKey = key as keyof InterpretMusicalIntentOutput;
      const value = params[typedKey];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        const numericValue = Number(value);
        const validator = targetParams[typedKey];

        if (!isNaN(numericValue) && validator) {
          if ('min' in validator && 'max' in validator) {
            if (numericValue >= validator.min && numericValue <= validator.max) {
              queryParams.append(typedKey, numericValue.toString());
              hasTargets = true;
            } else {
              console.warn(`spotify-service: ${typedKey} value ${numericValue} is out of range [${validator.min}-${validator.max}]. Ignoring.`);
            }
          } else if ('exactValues' in validator && validator.exactValues?.includes(numericValue)) {
             queryParams.append(typedKey, numericValue.toString());
             hasTargets = true;
          } else if ('exactValues' in validator) {
            console.warn(`spotify-service: ${typedKey} value ${numericValue} is not one of the allowed values [${validator.exactValues.join(', ')}]. Ignoring.`);
          }
        } else if (validator) {
           console.warn(`spotify-service: ${typedKey} value '${value}' is not a valid number or validator missing. Ignoring.`);
        }
      }
    }
  }

  if (seedCount === 0 && !hasTargets) {
    console.warn("spotify-service: No valid seeds and no target parameters provided for Spotify recommendations. Returning empty results.");
    return { songs: [], total: 0 };
  }
  if (seedCount === 0 && hasTargets) {
    console.warn("spotify-service: Spotify recommendations called with target parameters but no seeds. Results may be broad or an error might occur from Spotify.");
  }
   if (seedCount > 5) {
    // This should ideally be caught earlier (AI or buildSpotifyParams)
    console.warn(`spotify-service: Too many seeds (${seedCount}) after filtering. Spotify allows max 5. Using first 5 based on priority (artists, genres, tracks).`);
  }

  const recommendationsUrl = `${SPOTIFY_API_BASE}/recommendations?${queryParams.toString()}`;
  console.log(`spotify-service: Fetching Spotify recommendations with URL: ${recommendationsUrl}`);

  const response = await fetch(recommendationsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`spotify-service: Recommendations API response status: ${response.status}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`spotify-service: Spotify Recommendations API Error: ${response.status} ${response.statusText}. Query: ${recommendationsUrl}. Response: ${errorBody}`);
    if (response.status === 400) {
        console.error("spotify-service: Spotify API returned 400 Bad Request. This often means the seeds (especially genres) or target parameters were invalid or incompatible. Please verify genres in moods.json against Spotify's available genre seeds and ensure target values are within expected ranges.");
    }
    return { songs: [], total: 0 };
  }

  const data: SpotifyRecommendationsResponse = await response.json();
  const tracks = data.tracks || [];
  const songs = tracks.map(mapSpotifyItemToSong);

  if (songs.length === 0) {
    console.log("spotify-service: Received 0 recommended tracks from Spotify for the given parameters (query was valid).");
  } else {
    console.log(`spotify-service: Received ${songs.length} recommended tracks from Spotify. Raw tracks count: ${tracks.length}`);
  }

  const total = songs.length === limit && songs.length > 0 ? songs.length + limit : songs.length;

  return { songs, total };
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
    market: 'US',
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
    q: `artist:"${normalizedArtistName}"`, // Use exact phrase search for artist
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
    query += ` artist:"${normalizedArtistName}"`; // Use exact phrase for artist if provided
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
    return availableGenresCache || []; // Return old cache on error if available
  }
  const data: { genres: string[] } = await response.json();
  availableGenresCache = data.genres || [];
  genresCacheTimestamp = now;
  console.log(`spotify-service: Fetched and cached ${availableGenresCache.length} genre seeds.`);
  return availableGenresCache;
}

// Deprecated function as details are no longer fetched separately in the primary user flow.
// This was used for the "Song Link" feature which has been removed.
// export async function getSpotifyTrackDetailsAndFeatures(trackId: string): Promise<any | null> {
//   // ... implementation (can be removed or kept if there's another use case)
//   return null;
// }
