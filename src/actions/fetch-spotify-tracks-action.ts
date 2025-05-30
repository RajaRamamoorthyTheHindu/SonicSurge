
// src/actions/fetch-spotify-tracks-action.ts
'use server';

import type { Song } from '@/types'; // Added import for Song type
import { 
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
    // Since recommendations endpoint is assumed deprecated, always use search with the fallbackQuery.
    if (aiOutput.fallbackSearchQuery && aiOutput.fallbackSearchQuery.trim() !== '') {
      console.log("fetchSpotifyTracksAction: Calling searchSpotifyTracksService with query:", aiOutput.fallbackSearchQuery);
      return await searchSpotifyTracksService(aiOutput.fallbackSearchQuery, limit, offset);
    } else {
      console.warn("fetchSpotifyTracksAction: AI provided no fallbackSearchQuery. Attempting a generic search.");
      // Fallback to a very generic search if AI somehow fails to provide a query
      return await searchSpotifyTracksService("popular music", limit, offset);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching Spotify tracks';
    console.error("Error in fetchSpotifyTracksAction:", errorMessage, error);
    return { songs: [], total: 0 }; 
  }
}

