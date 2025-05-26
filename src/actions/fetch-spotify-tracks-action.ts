
// src/actions/fetch-spotify-tracks-action.ts
'use server';

import { 
  getSpotifyRecommendationsService,
  searchSpotifyTracksService 
} from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent';
import type { Song } from '@/types';
import type { FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';


interface FetchSpotifyTracksResult {
  songs: Song[];
  total: number;
}

export async function fetchSpotifyTracksAction(
  aiOutput: InterpretMusicalIntentOutput,
  _formInput: FindYourVibeFormValues, // formInput might be less relevant now AI output is richer
  limit: number = 5,
  offset: number = 0
): Promise<FetchSpotifyTracksResult> {
  try {
    const hasSeeds = (aiOutput.seed_tracks && aiOutput.seed_tracks.length > 0) ||
                     (aiOutput.seed_artists && aiOutput.seed_artists.length > 0) ||
                     (aiOutput.seed_genres && aiOutput.seed_genres.length > 0);

    if (hasSeeds) {
      // Use Spotify Recommendations Endpoint
      // Note: Spotify recommendations don't use offset in the same way as search.
      // For simplicity in this iteration, 'offset' might not directly apply to recommendation pagination
      // without more complex seed management. We'll pass it, but the service might ignore it or
      // the service may fetch limit + offset and slice if a more advanced handling is implemented there.
      // For now, we primarily rely on 'limit'.
      console.log("Fetching recommendations with seeds:", aiOutput, "limit:", limit, "offset:", offset);
      return await getSpotifyRecommendationsService(aiOutput, limit); // _offset was removed from service
    } else if (aiOutput.fallbackSearchQuery) {
      // Use Spotify Search Endpoint with the AI-generated fallback query
      console.log("Fetching tracks with fallback search query:", aiOutput.fallbackSearchQuery, "limit:", limit, "offset:", offset);
      return await searchSpotifyTracksService(aiOutput.fallbackSearchQuery, limit, offset);
    } else {
      // No seeds and no fallback query from AI
      console.warn("AI provided no seeds and no fallback query. Cannot fetch songs.");
      return { songs: [], total: 0 };
    }
  } catch (error) {
    console.error("Error in fetchSpotifyTracksAction:", (error as Error).message, error);
    // Consider if a more specific error should be thrown or returned
    // For now, returning empty results on error.
    return { songs: [], total: 0 }; 
  }
}
