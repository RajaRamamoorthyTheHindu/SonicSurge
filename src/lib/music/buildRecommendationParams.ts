
import type { InterpretMusicalIntentOutput } from '@/types';
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
  seed_genres?: string[]; 
  search_keywords?: string[]; // New field for descriptive keywords
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

const moods: MoodConfig[] = moodsConfigData as MoodConfig[];

const languageToKeywordMap: Record<string, string> = {
  'Spanish': 'spanish',
  'French': 'french',
  'German': 'german',
  'Japanese': 'japanese',
  'Korean': 'korean',
  'Hindi': 'hindi',
  'Tamil': 'tamil',
};

// This function now builds a search query string instead of recommendation parameters.
export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): { fallbackSearchQuery: string } {
  
  let queryParts: string[] = [];

  const selectedMoodConfig = moods.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
    if (selectedMoodConfig.displayName) {
        queryParts.push(selectedMoodConfig.displayName.toLowerCase().replace(/ *\([^)]*\) */g, "").trim()); // Add display name as a keyword, remove parenthesized text
    }
    if (selectedMoodConfig.search_keywords && selectedMoodConfig.search_keywords.length > 0) {
      queryParts.push(...selectedMoodConfig.search_keywords);
    } else if (selectedMoodConfig.seed_genres && selectedMoodConfig.seed_genres.length > 0) {
      // Use seed_genres as keywords if search_keywords are not present
      queryParts.push(...selectedMoodConfig.seed_genres);
    }
  }

  // Add qualitative terms based on sliders
  if (moodInput.energy !== undefined && !isNaN(moodInput.energy)) {
    if (moodInput.energy >= 0.7) queryParts.push('energetic');
    else if (moodInput.energy <= 0.3) queryParts.push('calm');
  }
  if (moodInput.valence !== undefined && !isNaN(moodInput.valence)) {
    if (moodInput.valence >= 0.7) queryParts.push('happy');
    else if (moodInput.valence <= 0.3) queryParts.push('mellow'); // or sad, reflective
  }

  if (moodInput.tempo !== undefined) {
    const numericTempo = Number(moodInput.tempo);
    if (!isNaN(numericTempo) && numericTempo > 0) {
        if (numericTempo >= 140) queryParts.push('fast tempo');
        else if (numericTempo <= 90) queryParts.push('slow tempo');
        // Could add "BPM" + numericTempo but it might be too specific for general search
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

  // Construct the search query string
  let fallbackSearchQuery = "";
  if (queryParts.length > 0) {
    // Join unique parts with spaces
    fallbackSearchQuery = [...new Set(queryParts.map(p => p.trim().toLowerCase()).filter(p => p !== ''))].join(' ');
    // If the query seems too generic, add "music" to it.
    if (fallbackSearchQuery.length > 0 && fallbackSearchQuery.split(' ').length <= 2 && !fallbackSearchQuery.toLowerCase().includes('music')) {
        fallbackSearchQuery += " music";
    }
  } else {
    fallbackSearchQuery = "popular music"; // Default if no specific parts were generated
  }
  
  console.log("buildSpotifyParamsFromMoodInput generated query:", fallbackSearchQuery);
  return { fallbackSearchQuery };
}
