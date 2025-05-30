
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
    target_tempo?: number;
  };
}

const moods: MoodConfig[] = moodsData;

const languageToGenreMap: Record<string, string | string[]> = {
  'Spanish': 'latin',
  'French': 'french-pop',
  'German': 'german-pop',
  'Italian': 'italian-pop',
  'Portuguese': 'mpb',
  'Japanese': 'j-pop',
  'Korean': 'k-pop',
  'Hindi': 'indian',
  'Tamil': 'tamil',
  'Arabic': 'arabic',
  'Turkish': 'turkish-pop',
  'Swedish': 'swedish-pop',
};

export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> {
  const params: Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> & { seed_genres?: string[], target_tempo?: number } = {
    seed_genres: [],
  };

  const selectedMoodConfig = moods.find(
    (m) => m.name === moodInput.selectedMoodName
  );

  if (selectedMoodConfig) {
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
    if (selectedMoodConfig.defaults?.target_tempo !== undefined) {
      params.target_tempo = selectedMoodConfig.defaults.target_tempo;
    }
  }

  if (moodInput.energy !== undefined) {
    params.target_energy = moodInput.energy;
  }
  if (moodInput.valence !== undefined) {
    params.target_valence = moodInput.valence;
  }
  // Ensure tempo is a number and not an empty string or invalid
  if (moodInput.tempo !== undefined && moodInput.tempo !== "" && !isNaN(Number(moodInput.tempo))) {
    params.target_tempo = Number(moodInput.tempo);
  } else if (params.target_tempo === undefined && moodInput.tempo === "") { // if moodInput.tempo is explicitly empty, remove default
      delete params.target_tempo;
  }


  if (moodInput.languages) {
    moodInput.languages.forEach((lang) => {
      const genreSeeds = languageToGenreMap[lang];
      if (genreSeeds) {
        if (Array.isArray(genreSeeds)) {
          (params.seed_genres = params.seed_genres || []).push(...genreSeeds);
        } else {
          (params.seed_genres = params.seed_genres || []).push(genreSeeds);
        }
      }
    });
  }

  if (params.seed_genres && params.seed_genres.length > 0) {
    params.seed_genres = [...new Set(params.seed_genres)].slice(0, 5);
  } else {
    delete params.seed_genres; // Remove if empty
  }

  Object.keys(params).forEach(keyStr => {
    const key = keyStr as keyof typeof params;
    if (params[key] === undefined) {
      delete params[key];
    }
  });
  
  if (params.seed_genres && params.seed_genres.length === 0) {
    delete params.seed_genres;
  }

  return params;
}
