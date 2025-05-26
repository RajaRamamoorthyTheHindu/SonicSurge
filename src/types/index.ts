import type { InterpretMusicalIntentOutput as GenAiInterpretOutput } from '@/ai/flows/interpret-musical-intent';

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

export type InterpretMusicalIntentOutput = GenAiInterpretOutput;

export interface Genre {
  value: string;
  label: string;
}
