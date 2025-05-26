
import type { InterpretMusicalIntentOutput as GenAiInterpretOutput, InterpretMusicalIntentInput as GenAiInterpretInput } from '@/ai/flows/interpret-musical-intent';
export type { SpotifyTrackDetails } from '@/services/spotify-service';


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
export type InterpretMusicalIntentInput = GenAiInterpretInput;


export interface Genre {
  value: string;
  label: string;
}

