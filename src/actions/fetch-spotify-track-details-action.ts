
// src/actions/fetch-spotify-track-details-action.ts
'use server';

import { getSpotifyTrackDetailsAndFeatures } from '@/services/spotify-service';
import type { SpotifyTrackDetails } from '@/services/spotify-service';

// Re-exporting the type for easier import in the page component
export type { SpotifyTrackDetails };

export async function fetchSpotifyTrackDetailsAction(trackId: string): Promise<SpotifyTrackDetails | null> {
  try {
    const details = await getSpotifyTrackDetailsAndFeatures(trackId);
    return details;
  } catch (error) {
    console.error(`Error in fetchSpotifyTrackDetailsAction for Spotify track ${trackId}:`, error);
    // It's good practice to not expose raw error messages to the client directly unless sanitized.
    // Depending on requirements, you might throw a custom error or return a specific error object.
    return null; // Indicates failure to the caller
  }
}
