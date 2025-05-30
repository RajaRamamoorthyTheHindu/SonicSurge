
// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent,
 * primarily from a free-text mood description and optional song/instrument filters.
 * It now focuses on generating a rich search query for Spotify.
 *
 * @exported
 * - `InterpretMusicalIntentInput`: The input type for the interpretMusicalIntent function.
 * - `InterpretMusicalIntentOutput`: The return type for the interpretMusicalIntent function.
 * - `interpretMusicalIntent`: The function that handles the musical intent interpretation process.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import { 
  searchSpotifyTrackService 
} from '@/services/spotify-service'; // getAvailableGenreSeeds might still be useful for query keywords

// +---------------------+
// |   INPUT SCHEMA      |
// +---------------------+
const InterpretMusicalIntentInputSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional().describe('An optional specific song name to influence the search query.'),
  instrumentTags: z.string().optional().describe('Optional comma-separated list of key instruments to include in the search query (e.g., guitar, piano).'),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

// +---------------------+
// |   OUTPUT SCHEMA     |
// +---------------------+
const InterpretMusicalIntentOutputSchema = z.object({
  fallbackSearchQuery: z.string().describe("A rich and descriptive search query string for Spotify. Example: 'upbeat electronic music with piano like the song Levitating'")
}).describe("A search query for Spotify.");
export type InterpretMusicalIntentOutput = z.infer<typeof InterpretMusicalIntentOutputSchema>;


// +---------------------+
// |   GENKIT TOOLS      |
// +---------------------+

// Tool to get track details can help enrich the search query
const getSpotifyTrackInfoTool = ai.defineTool(
  {
    name: 'getSpotifyTrackInfoTool',
    description: 'Searches Spotify for a track by name and returns its name and primary artist if found. Useful for creating "music like [song by artist]" queries.',
    inputSchema: z.object({ 
      trackName: z.string().describe("The name of the track to search for."),
    }),
    outputSchema: z.object({
        foundTrackName: z.string().nullable().describe("The Spotify track name, or null if not found."),
        foundArtistName: z.string().nullable().describe("The primary artist of the track, or null if not found."),
    }).nullable().describe("An object containing the track name and artist name, or null if track not found."),
  },
  async ({ trackName }) => {
    try {
      const tracks = await searchSpotifyTrackService(trackName, undefined, 1);
      if (tracks[0]) {
        return {
          foundTrackName: tracks[0].name,
          foundArtistName: tracks[0].artists[0]?.name || null,
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getSpotifyTrackInfoTool:", error);
      return null;
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
  tools: [getSpotifyTrackInfoTool],
  prompt: `You are a sophisticated music recommendation engine. Your primary goal is to translate the user's preferences into a rich and descriptive search query string for Spotify.

User's Core Vibe Description: "{{{moodDescription}}}"

Consider the following additional information if provided:
Preferred Song Name: {{{songName}}}
Preferred Instruments: {{{instrumentTags}}}

You have access to the following tool:
- \`getSpotifyTrackInfoTool({ trackName: string })\`: Searches for a track by its name. If found, it returns the track's name and primary artist's name.

Based on ALL the information above, please return a JSON object matching the InterpretMusicalIntentOutputSchema, containing a single \`fallbackSearchQuery\` field.

Detailed Instructions for constructing the \`fallbackSearchQuery\`:
1.  **Core Vibe**: Start with the \`moodDescription\`. For example, if the mood is "energetic workout", the query might start with "energetic workout music".
2.  **Instruments**: If \`instrumentTags\` are provided (e.g., 'guitar, saxophone'), incorporate them into the query. For example: "energetic workout music with guitar and saxophone".
3.  **Song Name**: 
    *   If the user provided a \`songName\`, use the \`getSpotifyTrackInfoTool\` to get its official name and artist.
    *   If the tool returns valid info, append something like "similar to '[foundTrackName]' by '[foundArtistName]'" or "like '[foundTrackName]'" to the query. Example: "energetic workout music with guitar like 'Song X' by 'Artist Y'".
    *   If the tool doesn't find the song, you can still include the user's provided \`songName\` if it seems descriptive, e.g., "music like 'some obscure song title'".
4.  **Combine Naturally**: Construct a single, natural language query. Avoid just listing keywords.
    *   Good Example: "Chill electronic music with piano for late night drive similar to the song Viva La Vida"
    *   Bad Example: "chill electronic piano late_night_drive viva_la_vida"

5.  **Fallback**: If the \`moodDescription\` is very vague and no other information is provided, create a general query like "popular music" or "trending songs".

IMPORTANT: The output MUST be a JSON object with only the \`fallbackSearchQuery\` field, containing the constructed search string.
Example Output:
{
  "fallbackSearchQuery": "upbeat pop dance music with synth for summer road trip like 'Blinding Lights' by The Weeknd"
}
Ensure the output is valid JSON matching the schema.
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
    console.log("interpretMusicalIntentFlow (free-text mood) input:", JSON.stringify(input));
    const {output} = await interpretMusicalIntentPrompt(input);

    if (!output || !output.fallbackSearchQuery) {
        console.warn("AI prompt 'interpretMusicalIntentPrompt' did not return a valid fallbackSearchQuery for input:", input, "Generated output:", JSON.stringify(output));
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
        return { fallbackSearchQuery: fallback.trim() };
    }
    
    console.log("interpretMusicalIntentFlow (free-text mood) output:", JSON.stringify(output));
    return output;
  }
);

// +---------------------+
// | EXPORTED FUNCTION   |
// +---------------------+
export async function interpretMusicalIntent(input: InterpretMusicalIntentInput): Promise<InterpretMusicalIntentOutput> {
  return interpretMusicalIntentFlow(input);
}
