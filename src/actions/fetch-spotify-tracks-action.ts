// src/actions/fetch-spotify-tracks-action.ts
'use server';

import { searchSpotifyTracksService } from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput, Song } from '@/types';

interface FetchSpotifyTracksResult {
  songs: Song[];
  total: number;
}

export async function fetchSpotifyTracksAction(
  aiOutput: InterpretMusicalIntentOutput,
  formInput: { songName?: string; artistName?: string },
  limit: number = 5,
  offset: number = 0
): Promise<FetchSpotifyTracksResult> {
  const queryParts: string[] = [];
  
  if (formInput.songName) {
     queryParts.push(`track:"${formInput.songName}"`);
  }
  if (formInput.artistName) {
    queryParts.push(`artist:"${formInput.artistName}"`);
  }
  
  if (queryParts.length === 0) {
    if (aiOutput.artistSimilarity && aiOutput.artistSimilarity.length > 0) {
        queryParts.push(`artist:"${aiOutput.artistSimilarity[0]}"`);
    }
  }

  if (aiOutput.genreAffinities && aiOutput.genreAffinities.length > 0) {
    queryParts.push(`genre:"${aiOutput.genreAffinities[0]}"`);
  }
  
  if (aiOutput.moodDescriptors && aiOutput.moodDescriptors.length > 0 && queryParts.length < 2) {
    queryParts.push(aiOutput.moodDescriptors[0]); 
  }
  
  let queryString = queryParts.join(' ');

  if (!queryString.trim()) {
    console.warn("No query parts from AI output or form input. Attempting a general popular search.");
    queryString = `genre:"${aiOutput.genreAffinities?.[0] || 'pop'}"`;
  }
  
  try {
    const { songs, total } = await searchSpotifyTracksService(queryString, limit, offset);
    return { songs, total };
  } catch (error: any) {
    console.error("Error in fetchSpotifyTracksAction:", error.message);
    return { songs: [], total: 0 }; 
  }
}
