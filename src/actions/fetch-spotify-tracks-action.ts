
// src/actions/fetch-spotify-tracks-action.ts
'use server';

import { 
  getSpotifyRecommendationsService,
  searchSpotifyTracksService 
} from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput } from '@/ai/flows/interpret-musical-intent';
import type { FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';


interface FetchSpotifyTracksResult {
  songs: Song[];
  total: number;
}

export async function fetchSpotifyTracksAction(
  aiOutput: InterpretMusicalIntentOutput,
  _formInput: FindYourVibeFormValues, // formInput might be less relevant now AI output is richer
  limit: number = 5,
  offset: number = 0 // offset is used for searchSpotifyTracksService
): Promise<FetchSpotifyTracksResult> {
  try {
    const hasSeedTracks = aiOutput.seed_tracks && aiOutput.seed_tracks.length > 0;
    const hasSeedArtists = aiOutput.seed_artists && aiOutput.seed_artists.length > 0;
    const hasSeedGenres = aiOutput.seed_genres && aiOutput.seed_genres.length > 0;
    const hasSeeds = hasSeedTracks || hasSeedArtists || hasSeedGenres;

    const hasTargets = Object.keys(aiOutput).some(k => k.startsWith('target_') && aiOutput[k as keyof InterpretMusicalIntentOutput] !== undefined);

    if (hasSeeds || hasTargets) {
      console.log("Fetching recommendations with seeds/targets:", JSON.stringify(aiOutput), "limit:", limit);
      // The getSpotifyRecommendationsService doesn't use offset directly for its main logic.
      return await getSpotifyRecommendationsService(aiOutput, limit);
    } else if (aiOutput.fallbackSearchQuery) {
      console.log("Fetching tracks with fallback search query:", aiOutput.fallbackSearchQuery, "limit:", limit, "offset:", offset);
      return await searchSpotifyTracksService(aiOutput.fallbackSearchQuery, limit, offset);
    } else {
      console.warn("AI provided no seeds, no targets, and no fallback query. Cannot fetch songs.");
      return { songs: [], total: 0 };
    }
  } catch (error) {
    console.error("Error in fetchSpotifyTracksAction:", (error as Error).message, error);
    // Consider if a more specific error should be thrown or returned
    // For now, returning empty results on error.
    return { songs: [], total: 0 }; 
  }
}
