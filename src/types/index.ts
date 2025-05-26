
import type { InterpretMusicalIntentOutput as GenAiInterpretOutput, InterpretMusicalIntentInput as GenAiInterpretInput } from '@/ai/flows/interpret-musical-intent';
// export type { SpotifyTrackDetails } from '@/services/spotify-service'; // No longer directly exporting this as it's not used in page/components after link parsing removal


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

// Genre type is no longer needed as the Genre field was removed from the form
// export interface Genre {
//   value: string;
//   label: string;
// }
