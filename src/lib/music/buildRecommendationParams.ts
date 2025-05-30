// src/lib/music/buildRecommendationParams.ts
// This file is currently not directly used by page.tsx as the AI flow `interpretMusicalIntent`
// is now responsible for synthesizing all mood-related inputs.
// However, its logic for constructing search queries from structured MoodComposer input
// has been adapted into the prompt for `interpretMusicalIntent` and the input preparation
// logic in `page.tsx`.

// Keeping the file for reference or future use as a non-AI fallback if needed.
/*
import type { InterpretMusicalIntentOutput } from '@/types'; // This type might need to be AIOutput or similar
import moodsConfigData from '@/config/moods.json'; 

export interface MoodInput {
  selectedMoodName?: string;
  energy?: number; // 0.0–1.0 (derived from 0-100 slider)
  valence?: number; // 0.0–1.0 (derived from 0-100 slider)
  tempo?: number | string; // BPM (e.g., 60-240) - Can be string from input
  languages?: string[]; // e.g., ["Tamil", "English"]
}

interface MoodConfig {
  name: string;
  displayName: string;
  search_keywords?: string[]; 
  defaults?: { 
    target_energy?: number;
    target_valence?: number;
    target_danceability?: number;
    target_instrumentalness?: number;
    target_acousticness?: number;
    target_liveness?: number;
    target_loudness?: number;
    target_mode?: number;
    target_popularity?: number;
    target_speechiness?: number;
    target_tempo?: number;
    target_time_signature?: number;
  };
}

const moodsData: MoodConfig[] = moodsConfigData as MoodConfig[];

const languageToKeywordMap: Record<string, string> = {
  'Spanish': 'spanish music',
  'French': 'french pop',
  'German': 'german electronic',
  'Japanese': 'japanese city pop',
  'Korean': 'k-pop',
  'Hindi': 'hindi film music',
  'Tamil': 'tamil music',
};

// This function now builds a rich search query string.
export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): { fallbackSearchQuery: string } {
  
  let queryParts: string[] = [];
  let baseQueryEstablished = false;

  const selectedMoodConfig = moodsData.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
    if (selectedMoodConfig.displayName) {
      queryParts.push(selectedMoodConfig.displayName);
      baseQueryEstablished = true;
    }
    if (selectedMoodConfig.search_keywords && selectedMoodConfig.search_keywords.length > 0) {
      queryParts.push(...selectedMoodConfig.search_keywords.slice(0, 2).map(kw => kw.trim()).filter(kw => kw)); 
      baseQueryEstablished = true;
    }
  }

  let energyDescriptor = '';
  if (moodInput.energy !== undefined && !isNaN(moodInput.energy)) {
    const energyVal = Math.max(0, Math.min(1, moodInput.energy)); // Clamp to 0-1
    if (energyVal >= 0.75) energyDescriptor = 'high energy';
    else if (energyVal >= 0.5) energyDescriptor = 'energetic';
    else if (energyVal <= 0.25) energyDescriptor = 'calm';
    else if (energyVal < 0.5) energyDescriptor = 'mellow';
    if (energyDescriptor) queryParts.push(energyDescriptor);
  }

  let valenceDescriptor = '';
  if (moodInput.valence !== undefined && !isNaN(moodInput.valence)) {
    const valenceVal = Math.max(0, Math.min(1, moodInput.valence)); // Clamp to 0-1
    if (valenceVal >= 0.75) valenceDescriptor = 'joyful';
    else if (valenceVal >= 0.5) valenceDescriptor = 'positive vibe';
    else if (valenceVal <= 0.25) valenceDescriptor = 'somber';
    else if (valenceVal < 0.5) valenceDescriptor = 'reflective';
     if (valenceDescriptor) queryParts.push(valenceDescriptor);
  }
  
  let tempoDescriptor = '';
  if (moodInput.tempo !== undefined && moodInput.tempo !== null && String(moodInput.tempo).trim() !== '') {
    const numericTempo = Number(moodInput.tempo);
    if (!isNaN(numericTempo) && numericTempo >= 40 && numericTempo <= 240) { // Spotify typical BPM range
        if (numericTempo >= 140) tempoDescriptor = 'fast tempo';
        else if (numericTempo <= 90) tempoDescriptor = 'slow tempo';
        else tempoDescriptor = 'mid-tempo';
        if (tempoDescriptor) queryParts.push(tempoDescriptor);
    } else {
        console.warn(`buildSpotifyParamsFromMoodInput: Invalid tempo value provided: ${moodInput.tempo}. Omitting from query.`);
    }
  }

  if (moodInput.languages && moodInput.languages.length > 0) {
    moodInput.languages.forEach((lang) => {
      const langKeyword = languageToKeywordMap[lang];
      if (langKeyword) {
        queryParts.push(langKeyword);
      }
    });
  }
  
  if (queryParts.length === 0 && !baseQueryEstablished) {
      if (energyDescriptor) queryParts.push(energyDescriptor + " music");
      else if (valenceDescriptor) queryParts.push(valenceDescriptor + " music");
      else if (tempoDescriptor) queryParts.push(tempoDescriptor + " music");
  }

  let fallbackSearchQuery = "";
  if (queryParts.length > 0) {
    fallbackSearchQuery = [...new Set(queryParts.map(p => p.trim().toLowerCase()).filter(p => p !== ''))].join(' ');
    const queryWords = fallbackSearchQuery.split(' ');
    const hasMusicTerm = queryWords.some(w => ['music', 'songs', 'pop', 'rock', 'jazz', 'electronic', 'folk', 'classical', 'beats', 'anthems', 'tracks', 'soundscapes', 'playlist', 'ballads', 'sound', 'scene', 'mix'].some(term => w.includes(term)));
    if (queryWords.length <= 2 && !hasMusicTerm) {
        fallbackSearchQuery += " music";
    }
  } else {
    fallbackSearchQuery = "popular music"; 
  }
  
  console.log("buildSpotifyParamsFromMoodInput generated query:", fallbackSearchQuery);
  return { fallbackSearchQuery };
}
*/
// To re-enable, uncomment the above block and ensure InterpretMusicalIntentOutput type is correctly referenced.
// Also, ensure the function is called from page.tsx where appropriate if not using AI for this path.
export {}; // Add an empty export to make this a module if all content is commented out.
