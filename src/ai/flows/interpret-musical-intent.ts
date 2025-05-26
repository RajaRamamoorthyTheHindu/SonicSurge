
// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent.
 * It takes user's mood, and other optional preferences.
 * It translates these into structured parameters for Spotify's recommendations endpoint or a fallback search query.
 *
 * @exported
 * - `InterpretMusicalIntentInput`: The input type for the interpretMusicalIntent function.
 * - `InterpretMusicalIntentOutput`: The return type for the interpretMusicalIntent function.
 * - `interpretMusicalIntent`: The function that handles the musical intent interpretation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretMusicalIntentInputSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional().describe('The name of a song the user likes (from advanced filters).'),
  artistName: z.string().optional().describe('The name of an artist the user likes (from advanced filters).'),
  instrumentTags: z.string().optional().describe('Comma-separated list of key instruments (e.g., guitar, piano, saxophone) (from advanced filters).'),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

const InterpretMusicalIntentOutputSchema = z.object({
  seed_tracks: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify track IDs to use as seeds for recommendations. Example: ["3n3Ppam7vgaVa1iaRUc9Lp"]'),
  seed_artists: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify artist IDs to use as seeds. Example: ["3TVXtAsR1Inumwj472S9r4"]'),
  seed_genres: z.array(z.string()).max(5).optional().describe('Up to 5 *valid Spotify genre strings* to use as seeds. Example: ["pop", "nu-disco", "acoustic"]. Do NOT use instrument names as genres.'),
  target_energy: z.number().min(0).max(1).optional().describe('Target energy level (0.0 to 1.0).'),
  target_danceability: z.number().min(0).max(1).optional().describe('Target danceability level (0.0 to 1.0).'),
  target_tempo: z.number().optional().describe('Target tempo in BPM (e.g., 120).'),
  target_valence: z.number().min(0).max(1).optional().describe('Target valence (musical positiveness, 0.0 to 1.0).'),
  target_instrumentalness: z.number().min(0).max(1).optional().describe('Target instrumentalness level (0.0 to 1.0, where 1.0 means no vocals).'),
  fallbackSearchQuery: z.string().optional().describe("A general search query string for Spotify if direct recommendation parameters cannot be formed. Example: 'upbeat electronic music'")
}).describe("Structured parameters for Spotify's recommendations endpoint, or a fallback search query.");
export type InterpretMusicalIntentOutput = z.infer<typeof InterpretMusicalIntentOutputSchema>;

export async function interpretMusicalIntent(input: InterpretMusicalIntentInput): Promise<InterpretMusicalIntentOutput> {
  return interpretMusicalIntentFlow(input);
}

const interpretMusicalIntentPrompt = ai.definePrompt({
  name: 'interpretMusicalIntentPrompt',
  input: {schema: InterpretMusicalIntentInputSchema},
  output: {schema: InterpretMusicalIntentOutputSchema},
  prompt: `You are a sophisticated music recommendation engine. Your primary goal is to translate the user's preferences into a structured set of parameters for Spotify's recommendations endpoint.

The user's core request is based on their Vibe Description: "{{{moodDescription}}}"

Consider the following additional information if provided from advanced filters:
Preferred Song Name: {{{songName}}}
Preferred Artist Name: {{{artistName}}}
Preferred Instruments: {{{instrumentTags}}}

Based on ALL the information above (prioritizing the moodDescription, then other form inputs), please return a JSON object matching the InterpretMusicalIntentOutputSchema.
Your main goal is to provide parameters for Spotify's recommendations endpoint.

- You MUST provide at least one seed (track, artist, or genre) if possible. You can use up to 5 seeds in total across \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` (e.g., 1 track, 2 artists, 2 genres).
- If \`instrumentTags\` are provided (e.g., 'guitar, saxophone'), use this information to:
  1.  Influence the \`target_instrumentalness\` value (a float between 0.0 and 1.0, where 1.0 represents high instrumentalness / no vocals).
  2.  Help select *valid Spotify genres* for the \`seed_genres\` array. For example, if 'piano' is mentioned, you might consider 'classical' or 'jazz' as genres. **IMPORTANT: Do NOT use instrument names themselves as entries in the \`seed_genres\` array.** Only use actual Spotify genre names.
  3.  If you are very confident an instrument tag points to a specific well-known instrumental track, you could use that track's ID as a \`seed_track\`.
- Infer potential genres from the mood description and any provided artist/song names for \`seed_genres\`. Ensure these are valid Spotify genres.
- If a song name or artist name is provided, try to find their Spotify IDs to use as seeds for \`seed_tracks\` or \`seed_artists\`.
- \`seed_tracks\`: (Optional) Array of Spotify track IDs.
- \`seed_artists\`: (Optional) Array of Spotify artist IDs.
- \`seed_genres\`: (Optional) Array of *valid Spotify genre strings*. Infer from mood, or provided artist/song, informed by instruments but NOT raw instrument names.
- \`target_energy\`, \`target_danceability\`, \`target_tempo\`, \`target_valence\`, \`target_instrumentalness\`: (Optional) Floats between 0.0 and 1.0 (tempo is BPM). Derive these from the mood description and other inputs like instruments.

IMPORTANT:
1. If you can confidently determine seeds (track, artist, or genre based on the inputs), prioritize populating \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` along with any relevant \`target_*\` values. Ensure all \`seed_genres\` are actual Spotify genres.
2. If you CANNOT confidently determine specific seeds, then provide a \`fallbackSearchQuery\` string. This query should be a descriptive search term for Spotify (e.g., "upbeat electronic music for '{{{moodDescription}}}'", "instrumental '{{{instrumentTags}}}' music for '{{{moodDescription}}}'").
3. The \`fallbackSearchQuery\` should ONLY be used if no seeds can be generated. Do not provide both seeds and a fallbackSearchQuery.
4. Only include fields in the JSON response if you have a value for them. Ensure the output is valid JSON.
`,
});

const interpretMusicalIntentFlow = ai.defineFlow(
  {
    name: 'interpretMusicalIntentFlow',
    inputSchema: InterpretMusicalIntentInputSchema,
    outputSchema: InterpretMusicalIntentOutputSchema,
  },
  async input => {
    const {output} = await interpretMusicalIntentPrompt(input);

    if (!output) {
        console.warn("AI prompt 'interpretMusicalIntentPrompt' did not return a valid output structure for input:", input);
        return {
            seed_tracks: undefined,
            seed_artists: undefined,
            seed_genres: undefined,
            fallbackSearchQuery: input.moodDescription ? `music for ${input.moodDescription}` : "popular music"
        };
    }
    
    const { seed_tracks, seed_artists, seed_genres } = output;
    const totalSeeds = (seed_tracks?.length || 0) + (seed_artists?.length || 0) + (seed_genres?.length || 0);
    
    if (totalSeeds > 5) {
        console.warn("AI returned more than 5 seeds, this might be an issue for Spotify. Prompt may need refinement.", output);
    }
    
    if (totalSeeds === 0 && !output.fallbackSearchQuery) {
        console.warn("AI returned no seeds and no fallback query. This might lead to no results. Forcing a fallback.", output);
        output.fallbackSearchQuery = input.moodDescription ? `music for ${input.moodDescription}` : "popular music";
        if (input.instrumentTags && !output.fallbackSearchQuery.includes(input.instrumentTags)) {
            output.fallbackSearchQuery += ` with ${input.instrumentTags}`;
        }
    }
    return output;
  }
);

