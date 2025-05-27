
// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent,
 * primarily from a free-text mood description and optional song/instrument filters.
 * It uses tools to resolve song names to Spotify IDs and validate genres against Spotify's available list.
 * It translates these into structured parameters for Spotify's recommendations endpoint or a fallback search query.
 *
 * @exported
 * - `InterpretMusicalIntentInput`: The input type for the interpretMusicalIntent function.
 * - `InterpretMusicalIntentOutput`: The return type for the interpretMusicalIntent function.
 * - `interpretMusicalIntent`: The function that handles the musical intent interpretation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { 
  getAvailableGenreSeeds, 
  searchSpotifyTrackService 
} from '@/services/spotify-service';

// +---------------------+
// |   INPUT SCHEMA      |
// +---------------------+
const InterpretMusicalIntentInputSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional().describe('The name of a song the user likes.'),
  instrumentTags: z.string().optional().describe('Comma-separated list of key instruments (e.g., guitar, piano, saxophone).'),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

// +---------------------+
// |   OUTPUT SCHEMA     |
// +---------------------+
// This schema is also used by interpret-profile-for-music.ts
const InterpretMusicalIntentOutputSchema = z.object({
  seed_tracks: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify track IDs to use as seeds for recommendations. Example: ["3n3Ppam7vgaVa1iaRUc9Lp"]'),
  seed_artists: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify artist IDs to use as seeds. Example: ["3TVXtAsR1Inumwj472S9r4"]'),
  seed_genres: z.array(z.string()).max(5).optional().describe('Up to 5 *valid Spotify genre strings* to use as seeds. Example: ["pop", "nu-disco", "acoustic"]. Must be chosen from the available Spotify genre seeds. Do NOT use instrument names as genres.'),
  target_energy: z.number().min(0).max(1).optional().describe('Target energy level (0.0 to 1.0).'),
  target_danceability: z.number().min(0).max(1).optional().describe('Target danceability level (0.0 to 1.0).'),
  target_tempo: z.number().min(40).max(240).optional().describe('Target tempo in BPM (e.g., 120).'),
  target_valence: z.number().min(0).max(1).optional().describe('Target valence (musical positiveness, 0.0 to 1.0).'),
  target_instrumentalness: z.number().min(0).max(1).optional().describe('Target instrumentalness level (0.0 to 1.0, where 1.0 means no vocals). Higher values for instrumental music.'),
  fallbackSearchQuery: z.string().optional().describe("A general search query string for Spotify if direct recommendation parameters cannot be formed. Example: 'upbeat electronic music'")
}).describe("Structured parameters for Spotify's recommendations endpoint, or a fallback search query.");
export type InterpretMusicalIntentOutput = z.infer<typeof InterpretMusicalIntentOutputSchema>;


// +---------------------+
// |   GENKIT TOOLS      |
// +---------------------+

const getValidSpotifyGenresTool = ai.defineTool(
  {
    name: 'getValidSpotifyGenresTool',
    description: 'Fetches the official list of available genre seeds from Spotify. Use this to validate and select genres for recommendations.',
    inputSchema: z.object({}), // No input needed
    outputSchema: z.array(z.string()),
  },
  async () => {
    try {
      return await getAvailableGenreSeeds();
    } catch (error) {
      console.error("Error in getValidSpotifyGenresTool:", error);
      return []; // Return empty on error to not break the flow
    }
  }
);

const getSpotifyTrackIdTool = ai.defineTool(
  {
    name: 'getSpotifyTrackIdTool',
    description: 'Searches Spotify for a track by name and returns its Spotify Track ID and primary Artist ID if found.',
    inputSchema: z.object({ 
      trackName: z.string().describe("The name of the track to search for."),
    }),
    outputSchema: z.object({
        trackId: z.string().nullable().describe("The Spotify Track ID, or null if not found."),
        artistId: z.string().nullable().describe("The Spotify Artist ID of the track's primary artist, or null if not found."),
    }).nullable().describe("An object containing the Track ID and Artist ID, or null if track not found."),
  },
  async ({ trackName }) => {
    try {
      const tracks = await searchSpotifyTrackService(trackName, undefined, 1);
      if (tracks[0]) {
        return {
          trackId: tracks[0].id,
          artistId: tracks[0].artists[0]?.id || null,
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getSpotifyTrackIdTool:", error);
      return null;
    }
  }
);


// +---------------------+
// |   MAIN PROMPT       |
// +---------------------+

const interpretMusicalIntentPrompt = ai.definePrompt({
  name: 'interpretMusicalIntentPrompt', // Keep name distinct if you have multiple similar prompts
  input: {schema: InterpretMusicalIntentInputSchema},
  output: {schema: InterpretMusicalIntentOutputSchema},
  tools: [getValidSpotifyGenresTool, getSpotifyTrackIdTool],
  prompt: `You are a sophisticated music recommendation engine. Your primary goal is to translate the user's preferences into a structured set of parameters for Spotify's recommendations endpoint.

User's Core Vibe Description: "{{{moodDescription}}}"

Consider the following additional information if provided from advanced filters:
Preferred Song Name: {{{songName}}}
Preferred Instruments: {{{instrumentTags}}}

You have access to the following tools:
- \`getValidSpotifyGenresTool()\`: Fetches the *complete and definitive list* of all valid Spotify genre seeds.
- \`getSpotifyTrackIdTool({ trackName: string })\`: Searches for a track by its name. If found, it returns both the track's Spotify ID and the primary artist's Spotify ID. Use the returned artist ID if you need an artist seed.

Based on ALL the information above, please return a JSON object matching the InterpretMusicalIntentOutputSchema.

Your main goal is to provide parameters for Spotify's recommendations endpoint.
- You MUST provide at least one seed (track, artist, or genre) if possible.
- You can use up to 5 seeds in total across \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` (e.g., 1 track, 2 artists, 2 genres).

Detailed Instructions:
1.  **Seed Tracks (\`seed_tracks\`) and Seed Artists (\`seed_artists\`) from Song Name**:
    *   If the user provided a \`songName\`, use the \`getSpotifyTrackIdTool\` to get its Spotify Track ID and primary Artist ID. 
    *   If the tool returns a valid object with a \`trackId\`, include this \`trackId\` in \`seed_tracks\`.
    *   If the tool also returns a valid \`artistId\` from that same track, you MAY include this \`artistId\` in \`seed_artists\`.
    *   If the tool returns null or no IDs, do not include anything for that song in \`seed_tracks\` or \`seed_artists\`.

2.  **Seed Genres (\`seed_genres\`)**:
    *   First, **you MUST call \`getValidSpotifyGenresTool()\`** to obtain the list of all valid Spotify genre seeds. This list is the ONLY source for valid genres.
    *   Based on the \`moodDescription\` and any other clues (like \`instrumentTags\` or themes from a provided song name), select up to 5 suitable genres for the \`seed_genres\` array.
    *   **CRITICAL**: Every genre you include in \`seed_genres\` MUST BE AN EXACT MATCH from the list returned by \`getValidSpotifyGenresTool\`. Do not invent genres, use variations, or attempt fuzzy matches yourself. Do not use instrument names (e.g., "piano", "guitar") as genres. If the user's mood implies a genre not on the tool's list, try to map it to the closest valid one(s) from the tool's list. If no suitable exact matches can be found from the tool's list, it is better to have an empty \`seed_genres\` array or use a very broad, valid genre (like "pop" or "electronic") from the tool's list if truly applicable and no other seeds are available.

3.  **Instrument Tags (\`instrumentTags\`)**:
    *   If \`instrumentTags\` are provided (e.g., 'guitar, saxophone'), use this information primarily to:
        a.  Influence the \`target_instrumentalness\` value (a float between 0.0 and 1.0, where 1.0 represents high instrumentalness / no vocals). For example, 'solo piano' suggests high instrumentalness.
        b.  Help select *valid Spotify genres* (from the list provided by \`getValidSpotifyGenresTool\`) for the \`seed_genres\` array. For example, if 'piano' is mentioned, you might consider 'classical' or 'jazz' *if they are on the valid genre list returned by the tool*.
    *   **Do NOT use instrument names themselves as entries in the \`seed_genres\` array.**

4.  **Target Audio Features (\`target_energy\`, \`target_danceability\`, etc.)**:
    *   Infer these values from the \`moodDescription\` and other inputs. For example, "workout hype" suggests high energy and danceability. "Chill study session" suggests lower energy.

IMPORTANT:
- If, after using the tools and analyzing the inputs, you can confidently determine seeds (track, artist, or genre resulting in valid string IDs), prioritize populating \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` along with any relevant \`target_*\` values.
- If you CANNOT confidently determine specific seeds (e.g., tools return no IDs, mood is too vague for valid genres from the tool's list, or the total number of valid seed IDs across tracks, artists, and genres is zero), THEN you MUST provide a \`fallbackSearchQuery\` string. This query should be a descriptive search term for Spotify (e.g., "upbeat electronic music for '{{{moodDescription}}}'", "instrumental '{{{instrumentTags}}}' music for '{{{moodDescription}}}'").
- The \`fallbackSearchQuery\` should ONLY be used if no valid seeds can be generated. Do not provide both seeds and a fallbackSearchQuery.
- Only include fields in the JSON response if you have a value for them.
- Ensure the output is valid JSON matching the schema.
`,
});

// +---------------------+
// |   FLOW DEFINITION   |
// +---------------------+
const interpretMusicalIntentFlow = ai.defineFlow(
  {
    name: 'interpretMusicalIntentFlow',
    inputSchema: InterpretMusicalIntentInputSchema,
    outputSchema: InterpretMusicalIntentOutputSchema,
  },
  async (input) => {
    console.log("interpretMusicalIntentFlow (free-text mood) input:", input);
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
        console.warn("AI (interpretMusicalIntentFlow) returned no seeds and no fallback query. Forcing a fallback.", output);
        let fallback = input.moodDescription ? `music for ${input.moodDescription}` : "popular music";
        if (input.instrumentTags && fallback && input.instrumentTags.trim() !== '') {
            if (!fallback.toLowerCase().includes(input.instrumentTags.toLowerCase())) {
                 fallback += ` with ${input.instrumentTags}`;
            }
        }
         if (input.songName && fallback && input.songName.trim() !== '') {
            if (!fallback.toLowerCase().includes(input.songName.toLowerCase())) {
                 fallback += ` like ${input.songName}`;
            }
        }
        output.fallbackSearchQuery = fallback.trim();
    }
    console.log("interpretMusicalIntentFlow (free-text mood) output:", output);
    return output;
  }
);

// +---------------------+
// | EXPORTED FUNCTION   |
// +---------------------+
export async function interpretMusicalIntent(input: InterpretMusicalIntentInput): Promise<InterpretMusicalIntentOutput> {
  return interpretMusicalIntentFlow(input);
}

    