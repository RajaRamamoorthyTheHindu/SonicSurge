
// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent.
 * It takes user's mood, and other optional preferences.
 * It uses tools to resolve artist names, song names to Spotify IDs, and validate genres.
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
  searchSpotifyArtistsService, 
  searchSpotifyTrackService 
} from '@/services/spotify-service';

// +---------------------+
// |   INPUT SCHEMA      |
// +---------------------+
const InterpretMusicalIntentInputSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional().describe('The name of a song the user likes.'),
  artistName: z.string().optional().describe('The name of an artist the user likes.'),
  instrumentTags: z.string().optional().describe('Comma-separated list of key instruments (e.g., guitar, piano, saxophone).'),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

// +---------------------+
// |   OUTPUT SCHEMA     |
// +---------------------+
const InterpretMusicalIntentOutputSchema = z.object({
  seed_tracks: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify track IDs to use as seeds for recommendations. Example: ["3n3Ppam7vgaVa1iaRUc9Lp"]'),
  seed_artists: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify artist IDs to use as seeds. Example: ["3TVXtAsR1Inumwj472S9r4"]'),
  seed_genres: z.array(z.string()).max(5).optional().describe('Up to 5 *valid Spotify genre strings* to use as seeds. Example: ["pop", "nu-disco", "acoustic"]. Must be chosen from the available Spotify genre seeds. Do NOT use instrument names as genres.'),
  target_energy: z.number().min(0).max(1).optional().describe('Target energy level (0.0 to 1.0).'),
  target_danceability: z.number().min(0).max(1).optional().describe('Target danceability level (0.0 to 1.0).'),
  target_tempo: z.number().optional().describe('Target tempo in BPM (e.g., 120).'),
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

const getSpotifyArtistIdTool = ai.defineTool(
  {
    name: 'getSpotifyArtistIdTool',
    description: 'Searches Spotify for an artist by name and returns their Spotify Artist ID if found.',
    inputSchema: z.object({ artistName: z.string().describe("The name of the artist to search for.") }),
    outputSchema: z.string().nullable().describe("The Spotify Artist ID, or null if not found."),
  },
  async ({ artistName }) => {
    try {
      const artists = await searchSpotifyArtistsService(artistName, 1);
      return artists[0]?.id || null;
    } catch (error) {
      console.error("Error in getSpotifyArtistIdTool:", error);
      return null; // Return null on error
    }
  }
);

const getSpotifyTrackIdTool = ai.defineTool(
  {
    name: 'getSpotifyTrackIdTool',
    description: 'Searches Spotify for a track by name (and optionally artist name) and returns its Spotify Track ID if found.',
    inputSchema: z.object({ 
      trackName: z.string().describe("The name of the track to search for."),
      artistName: z.string().optional().describe("Optional: The name of the artist to refine the search.")
    }),
    outputSchema: z.string().nullable().describe("The Spotify Track ID, or null if not found."),
  },
  async ({ trackName, artistName }) => {
    try {
      const tracks = await searchSpotifyTrackService(trackName, artistName, 1);
      return tracks[0]?.id || null;
    } catch (error) {
      console.error("Error in getSpotifyTrackIdTool:", error);
      return null; // Return null on error
    }
  }
);


// +---------------------+
// |   MAIN PROMPT       |
// +---------------------+

const interpretMusicalIntentPrompt = ai.definePrompt({
  name: 'interpretMusicalIntentPrompt',
  input: {schema: InterpretMusicalIntentInputSchema},
  output: {schema: InterpretMusicalIntentOutputSchema},
  tools: [getValidSpotifyGenresTool, getSpotifyArtistIdTool, getSpotifyTrackIdTool],
  prompt: `You are a sophisticated music recommendation engine. Your primary goal is to translate the user's preferences into a structured set of parameters for Spotify's recommendations endpoint.

User's Core Vibe Description: "{{{moodDescription}}}"

Consider the following additional information if provided from advanced filters:
Preferred Song Name: {{{songName}}}
Preferred Artist Name: {{{artistName}}}
Preferred Instruments: {{{instrumentTags}}}

You have access to the following tools:
- \`getValidSpotifyGenresTool()\`: Fetches all valid Spotify genre seeds.
- \`getSpotifyArtistIdTool({ artistName: string })\`: Searches for an artist and returns their Spotify ID.
- \`getSpotifyTrackIdTool({ trackName: string, artistName?: string })\`: Searches for a track and returns its Spotify ID.

Based on ALL the information above, please return a JSON object matching the InterpretMusicalIntentOutputSchema.

Your main goal is to provide parameters for Spotify's recommendations endpoint.
- You MUST provide at least one seed (track, artist, or genre) if possible.
- You can use up to 5 seeds in total across \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` (e.g., 1 track, 2 artists, 2 genres).

Detailed Instructions:
1.  **Seed Tracks (\`seed_tracks\`)**:
    *   If the user provided a \`songName\`, use the \`getSpotifyTrackIdTool\` (passing \`songName\` and optional \`artistName\`) to get its Spotify Track ID. If an ID is found, include it in \`seed_tracks\`.
    *   If \`instrumentTags\` strongly suggest a specific, well-known instrumental track, you *may* attempt to find its ID using \`getSpotifyTrackIdTool\`.

2.  **Seed Artists (\`seed_artists\`)**:
    *   If the user provided an \`artistName\`, use the \`getSpotifyArtistIdTool\` to get their Spotify Artist ID. If an ID is found, include it in \`seed_artists\`.

3.  **Seed Genres (\`seed_genres\`)**:
    *   First, call \`getValidSpotifyGenresTool\` to obtain the list of all valid Spotify genre seeds.
    *   Based on the \`moodDescription\` and any other clues (like \`instrumentTags\` or themes from provided song/artist names), select up to 5 suitable genres.
    *   **CRITICAL**: Every genre you include in \`seed_genres\` MUST be present in the list returned by \`getValidSpotifyGenresTool\`. Do not invent genres or use instrument names as genres. If a user's mood implies a genre not on the list, try to map it to the closest valid one(s) or omit it.

4.  **Instrument Tags (\`instrumentTags\`)**:
    *   If \`instrumentTags\` are provided (e.g., 'guitar, saxophone'), use this information primarily to:
        a.  Influence the \`target_instrumentalness\` value (a float between 0.0 and 1.0, where 1.0 represents high instrumentalness / no vocals). For example, 'solo piano' suggests high instrumentalness.
        b.  Help select *valid Spotify genres* for the \`seed_genres\` array. For example, if 'piano' is mentioned, you might consider 'classical' or 'jazz' if they are valid genres.
    *   **Do NOT use instrument names themselves as entries in the \`seed_genres\` array.**

5.  **Target Audio Features (\`target_energy\`, \`target_danceability\`, etc.)**:
    *   Infer these values from the \`moodDescription\` and other inputs. For example, "workout hype" suggests high energy and danceability. "Chill study session" suggests lower energy.

IMPORTANT:
- If, after using the tools and analyzing the inputs, you can confidently determine seeds (track, artist, or genre), prioritize populating \`seed_tracks\`, \`seed_artists\`, and \`seed_genres\` along with any relevant \`target_*\` values.
- If you CANNOT confidently determine specific seeds (e.g., tools return no IDs, mood is too vague for valid genres), THEN provide a \`fallbackSearchQuery\` string. This query should be a descriptive search term for Spotify (e.g., "upbeat electronic music for '{{{moodDescription}}}'", "instrumental '{{{instrumentTags}}}' music for '{{{moodDescription}}}'").
- The \`fallbackSearchQuery\` should ONLY be used if no seeds can be generated. Do not provide both seeds and a fallbackSearchQuery.
- Only include fields in the JSON response if you have a value for them.
- Ensure the output is valid JSON matching the schema.
`,
  // Example of relaxed safety settings if needed, though default is usually fine.
  // config: {
  //   safetySettings: [
  //     {
  //       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  //       threshold: 'BLOCK_NONE',
  //     },
  //   ],
  // },
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
    console.log("interpretMusicalIntentFlow input:", input);
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
        // Potentially truncate seeds here if necessary, or rely on Spotify to handle it / error.
        // For now, just logging.
    }
    
    if (totalSeeds === 0 && !output.fallbackSearchQuery) {
        console.warn("AI returned no seeds and no fallback query. Forcing a fallback.", output);
        output.fallbackSearchQuery = input.moodDescription ? `music for ${input.moodDescription}` : "popular music";
        if (input.instrumentTags && output.fallbackSearchQuery && !output.fallbackSearchQuery.includes(input.instrumentTags)) {
            output.fallbackSearchQuery += ` with ${input.instrumentTags}`;
        }
    }
    console.log("interpretMusicalIntentFlow output:", output);
    return output;
  }
);

// +---------------------+
// | EXPORTED FUNCTION   |
// +---------------------+
export async function interpretMusicalIntent(input: InterpretMusicalIntentInput): Promise<InterpretMusicalIntentOutput> {
  return interpretMusicalIntentFlow(input);
}
