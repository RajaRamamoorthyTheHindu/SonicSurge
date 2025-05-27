
import type { InterpretMusicalIntentOutput } from '@/types';
import moodsData from '@/config/moods.json';

export interface MoodInput {
  selectedMoodName?: string;
  energy?: number; // 0.0–1.0 (derived from 0-100 slider)
  valence?: number; // 0.0–1.0 (derived from 0-100 slider)
  tempo?: number; // BPM (e.g., 60-200)
  languages?: string[]; // e.g., ["Tamil", "English"]
  // Advanced song/artist/instrument filters are handled by AI if this composer isn't used.
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

// Simple language to Spotify genre seed mapping
// Ensure these are valid Spotify genres.
// This is a basic example; a more comprehensive mapping or AI assistance might be needed for broader language support.
const languageToGenreMap: Record<string, string | string[]> = {
  'Spanish': 'latin',
  'French': 'french-pop', // 'french' is a broad Spotify genre
  'German': 'german-pop', // 'german' is a broad Spotify genre
  'Italian': 'italian-pop', // 'italian' is a broad Spotify genre
  'Portuguese': 'mpb', // Musica Popular Brasileira, or 'portuguese-music'
  'Japanese': 'j-pop', // or 'j-rock', 'j-dance'
  'Korean': 'k-pop',
  'Hindi': 'indian', // or 'bollywood'
  'Tamil': 'tamil',
  'Arabic': 'arabic',
  'Turkish': 'turkish-pop', // 'turkish' is broad
  'Swedish': 'swedish-pop', // 'swedish' is broad
  // Add more mappings as needed
};

export function buildSpotifyParamsFromMoodInput(
  moodInput: MoodInput
): Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> {
  const params: Omit<InterpretMusicalIntentOutput, 'seed_tracks' | 'seed_artists' | 'fallbackSearchQuery'> & { seed_genres: string[] } = {
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

  // Override with slider values if provided
  if (moodInput.energy !== undefined) {
    params.target_energy = moodInput.energy;
  }
  if (moodInput.valence !== undefined) {
    params.target_valence = moodInput.valence;
  }
  if (moodInput.tempo !== undefined) {
    params.target_tempo = moodInput.tempo;
  }

  // Add language-based genres
  if (moodInput.languages) {
    moodInput.languages.forEach((lang) => {
      const genreSeeds = languageToGenreMap[lang];
      if (genreSeeds) {
        if (Array.isArray(genreSeeds)) {
          params.seed_genres.push(...genreSeeds);
        } else {
          params.seed_genres.push(genreSeeds);
        }
      }
    });
  }

  // Deduplicate genres and ensure a reasonable limit (Spotify allows up to 5 total seeds)
  // This builder only handles genre seeds; track/artist seeds would be added by AI if that path is taken.
  if (params.seed_genres.length > 0) {
    params.seed_genres = [...new Set(params.seed_genres)].slice(0, 5);
  }


  // Remove undefined properties
  Object.keys(params).forEach(keyStr => {
    const key = keyStr as keyof typeof params;
    if (params[key] === undefined) {
      delete params[key];
    }
  });
  
  if (params.seed_genres.length === 0) {
    // If after all this, we have no genre seeds, remove the empty array.
    // The caller (page.tsx) will then decide if it needs to use a fallback AI or default.
    delete params.seed_genres;
  }


  return params;
}
    