
import type { InterpretMusicalIntentOutput } from '@/types';
import moodsConfigData from '@/config/moods.json'; // Renamed to avoid conflict with moods variable

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
  seed_genres?: string[]; // Optional to allow moods with no genre seeds
  defaults?: { // All defaults are optional
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

// Ensure languageToGenreMap values are valid Spotify genres (user must verify this mapping)
const languageToGenreMap: Record<string, string | string[]> = {
  'Spanish': 'latin',
  'French': 'french-pop',
  'German': 'german-pop',
  'Japanese': 'j-pop',
  'Korean': 'k-pop',
  'Hindi': 'indian',
  'Tamil': 'tamil',
};

export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> {
  const params: Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> & { seed_genres?: string[] } = {
    seed_genres: [],
  };

  const selectedMoodConfig = moods.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
    // Apply seeds and defaults from selected mood
    if (selectedMoodConfig.seed_genres) {
      params.seed_genres = [...selectedMoodConfig.seed_genres];
    }
    if (selectedMoodConfig.defaults) {
      Object.assign(params, selectedMoodConfig.defaults);
    }
  }

  // Override with user slider/input values, ensuring they are valid numbers and within typical ranges
  if (moodInput.energy !== undefined && !isNaN(moodInput.energy)) {
    params.target_energy = Math.max(0, Math.min(1, moodInput.energy)); // Clamp 0-1
  }
  if (moodInput.valence !== undefined && !isNaN(moodInput.valence)) {
    params.target_valence = Math.max(0, Math.min(1, moodInput.valence)); // Clamp 0-1
  }

  if (moodInput.tempo !== undefined) {
    if (typeof moodInput.tempo === 'string' && moodInput.tempo.trim() === "") {
      delete params.target_tempo;
    } else {
      const numericTempo = Number(moodInput.tempo);
      if (!isNaN(numericTempo) && numericTempo >= 40 && numericTempo <= 240) {
        params.target_tempo = numericTempo;
      } else {
        // Invalid tempo or out of range, so we remove it to avoid sending bad data
        delete params.target_tempo;
        if (String(moodInput.tempo).trim() !== "") { // Log only if it wasn't intentionally empty
            console.warn(`buildSpotifyParams: Tempo value '${moodInput.tempo}' is invalid or out of range (40-240 BPM), omitting target_tempo.`);
        }
      }
    }
  }

  // Language to genre mapping
  if (moodInput.languages && moodInput.languages.length > 0) {
    moodInput.languages.forEach((lang) => {
      const genreSeedsToAdd = languageToGenreMap[lang];
      if (genreSeedsToAdd) {
        const currentGenres = params.seed_genres || [];
        if (Array.isArray(genreSeedsToAdd)) {
          params.seed_genres = [...currentGenres, ...genreSeedsToAdd];
        } else {
          params.seed_genres = [...currentGenres, genreSeedsToAdd];
        }
      }
    });
  }

  // Clean up seed_genres (unique, non-empty, max 5)
  if (params.seed_genres && params.seed_genres.length > 0) {
    params.seed_genres = [...new Set(params.seed_genres.map(g => g.trim()).filter(g => g !== ''))];
    if (params.seed_genres.length > 5) {
      console.warn(`buildSpotifyParams: More than 5 seed genres generated (${params.seed_genres.length}), truncating to 5.`);
      params.seed_genres = params.seed_genres.slice(0, 5);
    }
    if (params.seed_genres.length === 0) {
      delete params.seed_genres;
    }
  } else {
    delete params.seed_genres;
  }

  // Final cleanup for any undefined properties on params that might have been set from defaults
  // and then overridden to undefined or invalid values.
  // Spotify expects target parameters to be numbers if present.
  (Object.keys(params) as Array<keyof typeof params>).forEach(key => {
    if (key.startsWith('target_') && (params[key] === undefined || params[key] === null || (typeof params[key] === 'string' && (params[key] as string).trim() === ""))) {
      delete params[key];
    }
    // Specific numeric checks for targets (though spotify-service will do final validation)
    if (key === 'target_tempo' && (isNaN(Number(params[key])) || Number(params[key]) < 40 || Number(params[key]) > 240)) {
        delete params[key];
    }
    if (['target_energy', 'target_valence', 'target_danceability', 'target_instrumentalness', 'target_acousticness', 'target_liveness', 'target_speechiness'].includes(key)) {
        if (isNaN(Number(params[key])) || Number(params[key]) < 0 || Number(params[key]) > 1) {
            delete params[key];
        }
    }
  });

  return params;
}
