
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
  tools: [getSpotifyTrackInfoTool_profile],
  prompt: `You are an expert music curator. Your task is to translate the user's social profile analysis, and any specific song/instrument preferences, into a rich, descriptive search query for Spotify. This query should capture the *essence* and *musical characteristics* of the desired vibe based on their profile.

User's Social Profile Analysis:
Keywords: {{#if analysis.keywords.length}}{{#each analysis.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided{{/if}}
Location: {{#if analysis.location}}{{{analysis.location}}}{{else}}Not provided{{/if}}
Languages: {{#if analysis.languages.length}}{{#each analysis.languages}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided{{/if}}
Original Profile URL (for context if analysis is sparse): {{#if analysis.sourceUrl}}{{{analysis.sourceUrl}}}{{else}}Not provided{{/if}}

Additional User Preferences (if provided):
Specific Song Name: {{{songName}}}
Key Instruments: {{{instrumentTags}}}

You have access to the following tool:
- \`getSpotifyTrackInfoTool_profile({ trackName: string })\`: Searches for a track by name. Returns track name and primary artist name.

Based on ALL available information, return a JSON object with a single \`fallbackSearchQuery\` field for Spotify.

Detailed Instructions for constructing the \`fallbackSearchQuery\`:
1.  **Analyze Profile Musically**: Infer musical characteristics.
    *   From \`analysis.keywords\` (e.g., "coding" might suggest "focus electronic music", "photography" could imply "introspective ambient").
    *   From \`analysis.location\` (e.g., "music popular in Berlin", "songs from Brazil", "sounds of {{analysis.location}}").
    *   From \`analysis.languages\` (e.g., "Tamil indie scene", "French electronic pop").
    *   Consider tempo, energy, instrumentation, vocal style, and overall atmosphere that might align with the profile.

2.  **Song Name Integration**: If a \`songName\` is provided, use \`getSpotifyTrackInfoTool_profile\` to find its official name and artist.
    *   If found, construct a query like: "music for someone interested in {{#if analysis.keywords.length}}{{{analysis.keywords.[0]}}}{{else}}their profile interests{{/if}}, with a vibe like '{{foundTrackName}}' by '{{foundArtistName}}'".
    *   If not found, but the \`songName\` seems descriptive, incorporate it naturally.

3.  **Instrument Integration**: If \`instrumentTags\` are provided, weave them into the query, e.g., "music featuring {{instrumentTags}} for someone interested in {{#if analysis.keywords.length}}{{{analysis.keywords.[0]}}}{{else}}travel{{/if}}".

4.  **Combine Naturally**: Construct a single, natural language query. Aim for 3 to 7 significant terms or phrases.
    *   Good Example: "Chill electronic music with piano, popular in Berlin, for users interested in photography, similar to 'Strobe' by deadmau5"
    *   Bad Example: "berlin photography piano strobe deadmau5"

5.  **Fallback**: If profile analysis is very sparse and no additional preferences are given, generate a broad query based on any available info, or default to "music related to content from {{{analysis.sourceUrl}}}" or "diverse international music". Avoid generic "popular music" if possible.

IMPORTANT: The output MUST be a JSON object with only the \`fallbackSearchQuery\` field.
Example Output:
{
  "fallbackSearchQuery": "Tamil indie music popular in London for users interested in travel and AI research, with a vibe like 'Enjoy Enjaami'"
}
Ensure the output is valid JSON matching the schema.
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
    
    if (!output || !output.fallbackSearchQuery || output.fallbackSearchQuery.trim() === "") {
        console.warn("AI prompt 'interpretProfileForMusicPrompt' did not return a valid fallbackSearchQuery for input:", input, "Generated output:", JSON.stringify(output));
        let fallback = "popular music"; // Default
        if (input.songName) {
            fallback = `music like ${input.songName}`;
        } else if (input.analysis?.keywords && input.analysis.keywords.length > 0) {
            fallback = `music related to ${input.analysis.keywords.join(' ')}`;
        } else if (input.analysis?.location) {
            fallback = `music from ${input.analysis.location}`;
        } else if (input.instrumentTags) {
            fallback = `${input.instrumentTags} music`;
        } else if (input.analysis?.sourceUrl) {
             fallback = `music related to content from ${input.analysis.sourceUrl}`;
        }
        
        if (fallback.trim() === "") fallback = "popular music";
        return { fallbackSearchQuery: fallback.trim() };
    }
    
    console.log("interpretProfileForMusicFlow output:", JSON.stringify(output));
    return output;
  }
);

export async function interpretProfileAnalysisForMusic(input: InterpretProfileForMusicInput): Promise<InterpretMusicalIntentOutput> {
  return interpretProfileForMusicFlow(input) as Promise<InterpretMusicalIntentOutput>;
}
