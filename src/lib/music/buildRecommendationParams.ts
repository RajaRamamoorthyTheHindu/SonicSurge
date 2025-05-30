
import type { InterpretMusicalIntentOutput } from '@/types';
import moodsData from '@/config/moods.json';

export interface MoodInput {
  selectedMoodName?: string;
  energy?: number; // 0.0–1.0 (derived from 0-100 slider)
  valence?: number; // 0.0–1.0 (derived from 0-100 slider)
  tempo?: number | string; // BPM (e.g., 60-200) - Can be string from input
  languages?: string[]; // e.g., ["Tamil", "English"]
}

interface MoodConfig {
  name: string;
  displayName: string;
  seed_genres: string[];
  defaults: {
    target_energy?: number;
    target_valence?: number;
    target_danceability?: number;
    target_instrumentalness?: number;
    target_tempo?: number; // Ensure this is treated as a number
  };
}

const moods: MoodConfig[] = moodsData;

// Ensure languageToGenreMap values are valid Spotify genres
const languageToGenreMap: Record<string, string | string[]> = {
  'Spanish': 'latin', // "latin" is a broad and valid genre
  'French': 'french-pop', // "french-pop" or just "french" if more general
  'German': 'german-pop', // "german-pop" or "german"
  'Japanese': 'j-pop', // "j-pop" is valid
  'Korean': 'k-pop', // "k-pop" is valid
  'Hindi': 'indian', // "indian" is broad, consider "bollywood" if more specific
  'Tamil': 'tamil', // "tamil" is valid
  // Add more common languages and their corresponding Spotify genres
};

export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> {
  // Initialize params, ensuring target_tempo is typed as number | undefined
  const params: Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> & { seed_genres?: string[]; target_tempo?: number } = {
    seed_genres: [],
  };

  const selectedMoodConfig = moods.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
    // Apply defaults from selected mood
    params.seed_genres = [...selectedMoodConfig.seed_genres];
    if (selectedMoodConfig.defaults?.target_energy !== undefined) {
      params.target_energy = selectedMoodConfig.defaults.target_energy;
    }
    if (selectedMoodConfig.defaults?.target_valence !== undefined) {
      params.target_valence = selectedMoodConfig.defaults.target_valence;
    }
    if (selectedMoodConfig.defaults?.target_danceability !== undefined) {
      params.target_danceability = selectedMoodConfig.defaults.target_danceability;
    }
    if (selectedMoodConfig.defaults?.target_instrumentalness !== undefined) {
      params.target_instrumentalness = selectedMoodConfig.defaults.target_instrumentalness;
    }
    // Default tempo - ensure it's a number
    if (selectedMoodConfig.defaults?.target_tempo !== undefined && !isNaN(Number(selectedMoodConfig.defaults.target_tempo))) {
      params.target_tempo = Number(selectedMoodConfig.defaults.target_tempo);
    }
  }

  // Override with user slider/input values
  if (moodInput.energy !== undefined) {
    params.target_energy = moodInput.energy;
  }
  if (moodInput.valence !== undefined) {
    params.target_valence = moodInput.valence;
  }

  // Handle tempo input:
  // If user provided a valid number for tempo, use it.
  // If user explicitly cleared the tempo input (it's an empty string), ensure target_tempo is removed.
  // If moodInput.tempo is undefined (user hasn't touched the field), the default (if any) remains.
  if (moodInput.tempo !== undefined) { // Check if tempo field was interacted with at all
    if (typeof moodInput.tempo === 'string' && moodInput.tempo.trim() === "") {
      // User cleared the input or it was an empty string
      delete params.target_tempo;
    } else if (!isNaN(Number(moodInput.tempo)) && String(moodInput.tempo).trim() !== "") {
      // User provided a valid number (or string coercible to number)
      const numericTempo = Number(moodInput.tempo);
      if (numericTempo >= 40 && numericTempo <= 240) { // Spotify typical tempo range
         params.target_tempo = numericTempo;
      } else {
        // Tempo out of typical range, might be better to omit or log a warning
        // For now, we'll omit if out of a reasonable range to avoid bad requests
        delete params.target_tempo;
        console.warn(`Tempo value ${numericTempo} is outside typical range (40-240 BPM), omitting target_tempo.`);
      }
    }
    // If moodInput.tempo is defined but not a valid number and not an empty string,
    // it's an invalid input, so we don't set params.target_tempo, relying on default or undefined.
  }


  // Language to genre mapping
  if (moodInput.languages && moodInput.languages.length > 0) {
    moodInput.languages.forEach((lang) => {
      const genreSeedsToAdd = languageToGenreMap[lang];
      if (genreSeedsToAdd) {
        if (Array.isArray(genreSeedsToAdd)) {
          (params.seed_genres = params.seed_genres || []).push(...genreSeedsToAdd);
        } else {
          (params.seed_genres = params.seed_genres || []).push(genreSeedsToAdd);
        }
      }
    });
  }

  // Clean up seed_genres (unique, max 5)
  if (params.seed_genres && params.seed_genres.length > 0) {
    params.seed_genres = [...new Set(params.seed_genres)].filter(g => g.trim() !== ''); // Remove empty strings after unique
    if (params.seed_genres.length > 5) {
        params.seed_genres = params.seed_genres.slice(0,5);
    }
    if (params.seed_genres.length === 0) {
        delete params.seed_genres;
    }
  } else {
    delete params.seed_genres;
  }

  // Final cleanup for any undefined properties
  Object.keys(params).forEach(keyStr => {
    const key = keyStr as keyof typeof params;
    if (params[key] === undefined) {
      delete params[key];
    }
  });
  
  return params;
}
