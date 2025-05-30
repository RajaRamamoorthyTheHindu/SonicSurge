
'use server';
/**
 * @fileOverview This file defines a Genkit flow to interpret social profile analysis
 * along with optional song/instrument filters for music recommendations.
 * It now focuses on generating a rich search query for Spotify.
 *
 * @exported
 * - `InterpretProfileForMusicInput`: The input type for the interpretProfileAnalysisForMusic function.
 * - `InterpretProfileForMusicOutput`: The return type for the interpretProfileAnalysisForMusic function.
 * - `interpretProfileAnalysisForMusic`: The function that handles the interpretation.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
import type { AnalyzeSocialProfileOutput } from './analyze-social-profile'; 
import { searchSpotifyTrackService } from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput } from './interpret-musical-intent'; // Re-use this type for the output structure

// Define ProfileAnalysisOutputSchema locally - copied from analyze-social-profile.ts
const ProfileAnalysisOutputSchema = z.object({
  sourceUrl: z.string().url().optional().describe("The original URL that was analyzed."),
  keywords: z.array(z.string()).optional().describe('Keywords or topics extracted from the profile (e.g., "software engineering", "photography", "travel").'),
  location: z.string().optional().describe('The primary location (e.g., "City, Country") mentioned or inferred from the profile.'),
  languages: z.array(z.string()).optional().describe('Languages used or mentioned in the profile (e.g., ["English", "Spanish"]).'),
});

// Define the output schema locally, ensuring it matches InterpretMusicalIntentOutput structure
const InterpretProfileForMusicOutputSchema = z.object({
  fallbackSearchQuery: z.string().describe("A rich and descriptive search query string for Spotify based on profile analysis. Example: 'electronic music with piano popular in Berlin for users interested in coding'")
}).describe("A search query for Spotify based on profile analysis.");


const InterpretProfileForMusicInputSchema = z.object({
  analysis: ProfileAnalysisOutputSchema.describe("The structured analysis of the user's social profile."),
  songName: z.string().optional().describe('An optional specific song name to influence the search query.'),
  instrumentTags: z.string().optional().describe('Optional comma-separated list of key instruments to include in the search query.'),
});
export type InterpretProfileForMusicInput = z.infer<typeof InterpretProfileForMusicInputSchema>;


// Tool to get track details can help enrich the search query
const getSpotifyTrackInfoTool_profile = ai.defineTool(
  {
    name: 'getSpotifyTrackInfoTool_profile',
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
      console.error("Error in getSpotifyTrackInfoTool_profile:", error);
      return null;
    }
  }
);

const interpretProfileForMusicPrompt = ai.definePrompt({
  name: 'interpretProfileForMusicPrompt',
  input: { schema: InterpretProfileForMusicInputSchema },
  output: { schema: InterpretProfileForMusicOutputSchema },
  tools: [getSpotifyTrackInfoTool_profile], // Removed getValidSpotifyGenresTool as genres are now keywords
  prompt: `You are a music recommendation AI. Your goal is to generate a rich and descriptive Spotify search query based on a user's social profile analysis and any additional preferences.

User's Social Profile Analysis:
Keywords: {{#if analysis.keywords.length}}{{#each analysis.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided{{/if}}
Location: {{#if analysis.location}}{{{analysis.location}}}{{else}}Not provided{{/if}}
Languages: {{#if analysis.languages.length}}{{#each analysis.languages}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided{{/if}}
Original Profile URL (for context if analysis is sparse): {{#if analysis.sourceUrl}}{{{analysis.sourceUrl}}}{{else}}Not provided{{/if}}

Additional User Preferences (if provided):
Specific Song Name: {{{songName}}}
Key Instruments: {{{instrumentTags}}}

You have access to the following tool:
- \`getSpotifyTrackInfoTool({ trackName: string })\`: Searches for a track by name. Returns track name and primary artist name.

Based on ALL available information, return a JSON object with a single \`fallbackSearchQuery\` field for Spotify.

Instructions for constructing the \`fallbackSearchQuery\`:
1.  **Profile Insights**:
    *   Incorporate \`analysis.keywords\` (e.g., "coding", "photography").
    *   Incorporate \`analysis.location\` (e.g., "music popular in Berlin", "songs from Brazil").
    *   Incorporate \`analysis.languages\` (e.g., "Tamil music", "French pop songs").
2.  **Additional Preferences**:
    *   If \`songName\` is provided, use \`getSpotifyTrackInfoTool()\` to get its official name and artist. If found, add "similar to '[foundTrackName]' by '[foundArtistName]'" or "like '[foundTrackName]'" to the query.
    *   If \`instrumentTags\` are provided (e.g., 'piano'), include them naturally (e.g., "music with piano").
3.  **Combine**: Create a natural language search query. For example: "chill electronic music with piano popular in Berlin for users interested in photography, similar to the song 'Strobe' by deadmau5".
4.  **Fallback**: If profile analysis is very sparse and no additional preferences are given, generate a broad query based on any available info, or default to "popular music" or "music related to content from {{{analysis.sourceUrl}}}".

The output MUST be a JSON object with only the \`fallbackSearchQuery\` field.
Example Output:
{
  "fallbackSearchQuery": "Tamil indie music popular in London for users interested in travel and AI research, like 'Enjoy Enjaami'"
}
`,
});

const interpretProfileForMusicFlow = ai.defineFlow(
  {
    name: 'interpretProfileForMusicFlow',
    inputSchema: InterpretProfileForMusicInputSchema,
    outputSchema: InterpretProfileForMusicOutputSchema,
  },
  async (input) => {
    console.log("interpretProfileForMusicFlow input:", JSON.stringify(input));
    const {output} = await interpretProfileForMusicPrompt(input);
    
    if (!output || !output.fallbackSearchQuery) {
        console.warn("AI prompt 'interpretProfileForMusicPrompt' did not return a valid fallbackSearchQuery for input:", input, "Generated output:", JSON.stringify(output));
        let fallback = "popular music";
        if (input.songName) fallback = `music like ${input.songName}`;
        else if (input.instrumentTags) fallback = `${input.instrumentTags} music`;
        else if (input.analysis?.keywords && input.analysis.keywords.length > 0) fallback = `music related to ${input.analysis.keywords.join(' ')}`;
        else if (input.analysis?.location) fallback = `music from ${input.analysis.location}`;
        else if (input.analysis?.sourceUrl) fallback = `music related to content from ${input.analysis.sourceUrl}`;
        
        return { fallbackSearchQuery: fallback.trim() };
    }
    
    console.log("interpretProfileForMusicFlow output:", JSON.stringify(output));
    return output;
  }
);

export async function interpretProfileAnalysisForMusic(input: InterpretProfileForMusicInput): Promise<InterpretMusicalIntentOutput> {
  // The actual return type of the flow matches InterpretMusicalIntentOutput
  return interpretProfileForMusicFlow(input) as Promise<InterpretMusicalIntentOutput>;
}
