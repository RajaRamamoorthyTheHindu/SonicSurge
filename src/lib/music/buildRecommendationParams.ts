
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

const moods: MoodConfig[] = moodsConfigData as MoodConfig[];

const languageToKeywordMap: Record<string, string> = {
  'Spanish': 'spanish music',
  'French': 'french pop',
  'German': 'german electronic',
  'Japanese': 'japanese city pop', // Example, can be more specific
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

  const selectedMoodConfig = moods.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
    if (selectedMoodConfig.displayName) {
      queryParts.push(selectedMoodConfig.displayName); // More natural display name first
      baseQueryEstablished = true;
    }
    if (selectedMoodConfig.search_keywords && selectedMoodConfig.search_keywords.length > 0) {
      // Add a few diverse keywords from the mood config
      queryParts.push(...selectedMoodConfig.search_keywords.slice(0, 2)); 
      baseQueryEstablished = true;
    }
  }

  // Add qualitative terms based on sliders if a base mood was selected or if no mood but sliders are used
  let energyDescriptor = '';
  if (moodInput.energy !== undefined && !isNaN(moodInput.energy)) {
    if (moodInput.energy >= 0.75) energyDescriptor = 'high energy';
    else if (moodInput.energy >= 0.5) energyDescriptor = 'energetic';
    else if (moodInput.energy <= 0.25) energyDescriptor = 'calm';
    else if (moodInput.energy < 0.5) energyDescriptor = 'mellow';
    if (energyDescriptor) queryParts.push(energyDescriptor);
  }

  let valenceDescriptor = '';
  if (moodInput.valence !== undefined && !isNaN(moodInput.valence)) {
    if (moodInput.valence >= 0.75) valenceDescriptor = 'joyful';
    else if (moodInput.valence >= 0.5) valenceDescriptor = 'positive vibe';
    else if (moodInput.valence <= 0.25) valenceDescriptor = 'somber';
    else if (moodInput.valence < 0.5) valenceDescriptor = 'reflective';
     if (valenceDescriptor) queryParts.push(valenceDescriptor);
  }
  
  let tempoDescriptor = '';
  if (moodInput.tempo !== undefined) {
    const numericTempo = Number(moodInput.tempo);
    if (!isNaN(numericTempo) && numericTempo > 0 && numericTempo >= 40 && numericTempo <= 240) {
        if (numericTempo >= 140) tempoDescriptor = 'fast tempo';
        else if (numericTempo <= 90) tempoDescriptor = 'slow tempo';
        else tempoDescriptor = 'mid-tempo';
        if (tempoDescriptor) queryParts.push(tempoDescriptor);
    }
  }

  // Add language-based keywords
  if (moodInput.languages && moodInput.languages.length > 0) {
    moodInput.languages.forEach((lang) => {
      const langKeyword = languageToKeywordMap[lang];
      if (langKeyword) {
        queryParts.push(langKeyword);
      }
    });
  }
  
  // Ensure some base query if parts are still empty (e.g., user only moved sliders without selecting a mood)
  if (queryParts.length === 0 && !baseQueryEstablished) {
      if (energyDescriptor) queryParts.push(energyDescriptor + " music");
      else if (valenceDescriptor) queryParts.push(valenceDescriptor + " music");
      else if (tempoDescriptor) queryParts.push(tempoDescriptor + " music");
  }


  // Construct the final search query string
  let fallbackSearchQuery = "";
  if (queryParts.length > 0) {
    // Join unique parts with spaces, make it more like a natural phrase
    fallbackSearchQuery = [...new Set(queryParts.map(p => p.trim().toLowerCase()).filter(p => p !== ''))].join(' ');
    // If the query is very short and doesn't contain "music" or a genre-like term, append "music"
    const queryWords = fallbackSearchQuery.split(' ');
    const hasMusicTerm = queryWords.some(w => w.includes('music') || w.includes('songs') || w.includes('pop') || w.includes('rock') || w.includes('jazz') || w.includes('electronic') || w.includes('folk') || w.includes('classical'));
    if (queryWords.length <= 2 && !hasMusicTerm) {
        fallbackSearchQuery += " music";
    }
  } else {
    fallbackSearchQuery = "popular music"; // Absolute fallback
  }
  
  console.log("buildSpotifyParamsFromMoodInput generated query:", fallbackSearchQuery);
  return { fallbackSearchQuery };
}
