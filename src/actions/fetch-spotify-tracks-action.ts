// src/actions/fetch-spotify-tracks-action.ts
'use server';

import { searchSpotifyTracksService } from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput, Song } from '@/types';

export async function fetchSpotifyTracksAction(aiOutput: InterpretMusicalIntentOutput, formInput: { songName?: string; artistName?: string }): Promise<Song[]> {
  const queryParts: string[] = [];

  // Prefer specific details from form if they align with AI's broader categories,
  // or use AI's suggestions for discovery.
  // If user entered a song name and artist, and AI confirmed/used it, 
  // we might want songs *by* that artist or *in that style*.
  // For now, let's prioritize AI's "similarity" outputs for discovery.
  
  if (formInput.songName) {
     queryParts.push(`track:"${formInput.songName}"`);
  }
  if (formInput.artistName) {
    queryParts.push(`artist:"${formInput.artistName}"`);
  }
  
  // If no specific track/artist from form, or to broaden search with AI insights:
  if (queryParts.length === 0) { // Only use AI artist/genre if no specific form song/artist was given
    if (aiOutput.artistSimilarity && aiOutput.artistSimilarity.length > 0) {
        queryParts.push(`artist:"${aiOutput.artistSimilarity[0]}"`);
    }
  }

  if (aiOutput.genreAffinities && aiOutput.genreAffinities.length > 0) {
    queryParts.push(`genre:"${aiOutput.genreAffinities[0]}"`);
  }
  
  if (aiOutput.moodDescriptors && aiOutput.moodDescriptors.length > 0 && queryParts.length < 2) {
    // Add mood as a general keyword if we don't have many specific query parts yet
    queryParts.push(aiOutput.moodDescriptors[0]); 
  }
  
  let queryString = queryParts.join(' ');

  if (!queryString.trim()) {
    console.warn("No query parts from AI output or form input. Attempting a general popular search.");
    // Fallback to a very generic query if nothing specific is derived.
    // This could be a popular genre or simply "popular" if Spotify supports it well.
    // For now, let's try a broad genre if available, or default to 'pop' or similar.
    queryString = `genre:"${aiOutput.genreAffinities?.[0] || 'pop'}"`;
  }
  
  try {
    // Fetch a bit more initially, e.g. 10, then filter or let user scroll if UI supports. Max 5 for now.
    const songs = await searchSpotifyTracksService(queryString, 5);
    return songs;
  } catch (error: any) {
    console.error("Error in fetchSpotifyTracksAction:", error.message);
    // Gracefully return empty list to UI, error is logged server-side.
    // Client-side can show a toast based on empty result.
    return []; 
  }
}
