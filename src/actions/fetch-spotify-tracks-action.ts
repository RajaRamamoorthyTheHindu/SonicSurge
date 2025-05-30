
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
  _formInput: FindYourVibeFormValues, 
  limit: number = 5,
  offset: number = 0 
): Promise<FetchSpotifyTracksResult> {
  console.log("fetchSpotifyTracksAction: Received AI Output:", JSON.stringify(aiOutput));
  console.log("fetchSpotifyTracksAction: Form Input (for context):", JSON.stringify(_formInput));
  console.log("fetchSpotifyTracksAction: Limit:", limit, "Offset:", offset);

  try {
    const hasSeedTracks = aiOutput.seed_tracks && aiOutput.seed_tracks.length > 0;
    const hasSeedArtists = aiOutput.seed_artists && aiOutput.seed_artists.length > 0;
    const hasSeedGenres = aiOutput.seed_genres && aiOutput.seed_genres.length > 0;
    const hasSeeds = hasSeedTracks || hasSeedArtists || hasSeedGenres;

    const hasTargets = Object.keys(aiOutput).some(k => k.startsWith('target_') && aiOutput[k as keyof InterpretMusicalIntentOutput] !== undefined);

    if (hasSeeds || hasTargets) {
      console.log("fetchSpotifyTracksAction: Calling getSpotifyRecommendationsService with seeds/targets.");
      return await getSpotifyRecommendationsService(aiOutput, limit);
    } else if (aiOutput.fallbackSearchQuery) {
      console.log("fetchSpotifyTracksAction: Calling searchSpotifyTracksService with fallback query:", aiOutput.fallbackSearchQuery);
      return await searchSpotifyTracksService(aiOutput.fallbackSearchQuery, limit, offset);
    } else {
      console.warn("fetchSpotifyTracksAction: AI provided no seeds, no targets, and no fallback query. Cannot fetch songs.");
      return { songs: [], total: 0 };
    }
  } catch (error) {
    console.error("Error in fetchSpotifyTracksAction:", (error as Error).message, error);
    return { songs: [], total: 0 }; 
  }
}
