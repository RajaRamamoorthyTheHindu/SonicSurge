// src/types/index.ts

import type { InterpretMusicalIntentOutput as GenAiInterpretOutput, InterpretMusicalIntentInput as GenAiInterpretInput } from '@/ai/flows/interpret-musical-intent';
import type { AnalyzeSocialProfileOutput as GenAIProfileOutput, AnalyzeSocialProfileInput as GenAIProfileInput } from '@/ai/flows/analyze-social-profile';
import type { InterpretProfileForMusicInput as GenAIProfileInterpretInput } from '@/ai/flows/interpret-profile-for-music';


export interface Song {
  id: string;
  albumArtUrl: string;
  songTitle: string;
  artistName: string;
  albumName?: string;
  platformLinks: {
    spotify?: string;
    youtube?: string;
    // appleMusic?: string; // Not currently implemented
  };
  aiHint?: string;
}

// AI Flow Types
export type InterpretMusicalIntentOutput = GenAiInterpretOutput;
export type InterpretMusicalIntentInput = GenAiInterpretInput;

export type ProfileAnalysisOutput = GenAIProfileOutput; // This is the Zod schema-derived type
export type AnalyzeSocialProfileInput = GenAIProfileInput;

// InterpretProfileForMusicOutput is structurally the same as InterpretMusicalIntentOutput (fallbackSearchQuery)
export type InterpretProfileForMusicOutput = GenAiInterpretOutput; 
export type InterpretProfileForMusicInput = GenAIProfileInterpretInput;
