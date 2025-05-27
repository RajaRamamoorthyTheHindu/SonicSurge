
import type { InterpretMusicalIntentOutput as GenAiInterpretOutput, InterpretMusicalIntentInput as GenAiInterpretInput } from '@/ai/flows/interpret-musical-intent';
import type { AnalyzeSocialProfileOutput as GenAIProfileOutput, AnalyzeSocialProfileInput as GenAIProfileInput } from '@/ai/flows/analyze-social-profile';
import type { InterpretProfileForMusicOutput as GenAIProfileInterpretOutput, InterpretProfileForMusicInput as GenAIProfileInterpretInput } from '@/ai/flows/interpret-profile-for-music';


export interface Song {
  id: string;
  albumArtUrl: string;
  songTitle: string;
  artistName: string;
  albumName?: string;
  platformLinks: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
  };
  aiHint?: string;
}

// AI Flow Types
export type InterpretMusicalIntentOutput = GenAiInterpretOutput;
export type InterpretMusicalIntentInput = GenAiInterpretInput;

export type ProfileAnalysisOutput = GenAIProfileOutput;
export type ProfileAnalysisInput = GenAIProfileInput;

export type InterpretProfileForMusicOutput = GenAIProfileInterpretOutput; // This is often same as InterpretMusicalIntentOutput
export type InterpretProfileForMusicInput = GenAIProfileInterpretInput;

    