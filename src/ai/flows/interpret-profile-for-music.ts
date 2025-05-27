
'use server';
/**
 * @fileOverview This file defines a Genkit flow to interpret social profile analysis
 * along with optional song/instrument filters for music recommendations.
 *
 * @exported
 * - `InterpretProfileForMusicInput`: The input type for the interpretProfileAnalysisForMusic function.
 * - `InterpretProfileForMusicOutput`: The return type for the interpretProfileAnalysisForMusic function (same as InterpretMusicalIntentOutput).
 * - `interpretProfileAnalysisForMusic`: The function that handles the interpretation.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';
// Removed import of ProfileAnalysisOutputSchema value from ./analyze-social-profile
import type { ProfileAnalysisOutput } from './analyze-social-profile'; // Only import the type
import { getAvailableGenreSeeds, searchSpotifyTrackService } from '@/services/spotify-service';
import type { InterpretMusicalIntentOutput } from './interpret-musical-intent'; // Only import the type

// Define ProfileAnalysisOutputSchema locally - copied from analyze-social-profile.ts
const ProfileAnalysisOutputSchema = z.object({
  sourceUrl: z.string().url().optional().describe("The original URL that was analyzed."),
  keywords: z.array(z.string()).optional().describe('Keywords or topics extracted from the profile (e.g., "software engineering", "photography", "travel").'),
  location: z.string().optional().describe('The primary location (e.g., "City, Country") mentioned or inferred from the profile.'),
  languages: z.array(z.string()).optional().describe('Languages used or mentioned in the profile (e.g., ["English", "Spanish"]).'),
});

// Define the output schema locally, ensuring it matches InterpretMusicalIntentOutput structure
const InterpretProfileForMusicOutputSchema = z.object({
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


const InterpretProfileForMusicInputSchema = z.object({
  analysis: ProfileAnalysisOutputSchema.describe("The structured analysis of the user's social profile."), // Uses the locally defined schema
  songName: z.string().optional().describe('An optional specific song name to influence recommendations.'),
  instrumentTags: z.string().optional().describe('Optional comma-separated list of key instruments.'),
});
export type InterpretProfileForMusicInput = z.infer<typeof InterpretProfileForMusicInputSchema>;


const getValidSpotifyGenresTool = ai.defineTool(
  {
    name: 'getValidSpotifyGenresTool_profile', // Keep tool names unique if schemas differ slightly or for clarity
    description: 'Fetches the official list of available genre seeds from Spotify. Use this to validate and select genres for recommendations.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.string()),
  },
  async () => {
    try {
      return await getAvailableGenreSeeds();
    } catch (error) {
      console.error("Error in getValidSpotifyGenresTool_profile:", error);
      return [];
    }
  }
);

const getSpotifyTrackIdTool_profile = ai.defineTool(
  {
    name: 'getSpotifyTrackIdTool_profile',
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
      console.error("Error in getSpotifyTrackIdTool_profile:", error);
      return null;
    }
  }
);

const interpretProfileForMusicPrompt = ai.definePrompt({
  name: 'interpretProfileForMusicPrompt',
  input: { schema: InterpretProfileForMusicInputSchema },
  output: { schema: InterpretProfileForMusicOutputSchema }, // Use the locally defined schema
  tools: [getValidSpotifyGenresTool, getSpotifyTrackIdTool_profile],
  prompt: `You are a music recommendation AI. Your goal is to suggest music based on a user's social profile analysis and any additional preferences.

User's Social Profile Analysis:
Keywords: {{#if analysis.keywords.length}}{{#each analysis.keywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided or N/A{{/if}}
Location: {{#if analysis.location}}{{{analysis.location}}}{{else}}Not provided or N/A{{/if}}
Languages: {{#if analysis.languages.length}}{{#each analysis.languages}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not provided or N/A{{/if}}
Original Profile URL (for context if analysis is sparse): {{#if analysis.sourceUrl}}{{{analysis.sourceUrl}}}{{else}}Not provided or N/A{{/if}}

Additional User Preferences (if provided):
Specific Song Name: {{{songName}}}
Key Instruments: {{{instrumentTags}}}

You have access to the following tools:
- \`getValidSpotifyGenresTool()\`: Fetches the *complete and definitive list* of all valid Spotify genre seeds.
- \`getSpotifyTrackIdTool({ trackName: string })\`: Searches for a track by its name. Returns Track ID and primary Artist ID.

Based on ALL available information, return a JSON object matching the InterpretProfileForMusicOutputSchema for Spotify's recommendations.

Instructions:
1.  **Primary Seeds from Profile**:
    *   Use the \`getValidSpotifyGenresTool()\` to get valid Spotify genres.
    *   From the \`analysis.languages\` and \`analysis.location\`, try to select relevant and *valid* genres from the tool's list for \`seed_genres\`. For example, 'Tamil' language might suggest 'tamil' genre; 'Brazil' location might suggest 'brazilian' or 'mpb' if they are valid.
    *   The \`analysis.keywords\` should primarily influence \`target_*\` audio features (e.g., "coding", "focus" might suggest lower energy, higher instrumentalness; "running", "motivation" might suggest higher energy).
2.  **Seeds from Additional Preferences**:
    *   If \`songName\` is provided, use \`getSpotifyTrackIdTool()\` to get its Track ID and primary Artist ID. If found, include them in \`seed_tracks\` and/or \`seed_artists\`.
    *   If \`instrumentTags\` are provided, use them to influence \`target_instrumentalness\` or help select *valid* genres (e.g., 'piano' could support 'classical' if it's a valid genre). Do NOT use instrument names directly as genres.
3.  **Seed Limits & Fallback**:
    *   Limit total seeds (tracks, artists, genres) to 5.
    *   If profile analysis is sparse or unavailable (e.g. keywords, location, languages are all empty/missing), rely more heavily on any provided \`songName\` or \`instrumentTags\` to generate seeds or target audio features.
    *   If you CANNOT confidently determine seeds, THEN provide a \`fallbackSearchQuery\` string based on the most relevant available information (e.g., keywords, or a general query like "popular music related to {{{analysis.sourceUrl}}}").
    *   Prioritize seeds if possible. Only use \`fallbackSearchQuery\` if no valid seeds can be generated.
4.  **Output**: Ensure valid JSON matching the schema. Only include fields if you have a value.

Example: If location is "Chennai, India" and languages include "Tamil", you might select "tamil" and "indian" as seed_genres (if they are on the valid list). If keywords include "technology" and "startups", target_energy might be moderate, target_valence neutral.
`,
});

const interpretProfileForMusicFlow = ai.defineFlow(
  {
    name: 'interpretProfileForMusicFlow',
    inputSchema: InterpretProfileForMusicInputSchema,
    outputSchema: InterpretProfileForMusicOutputSchema, // Use the locally defined schema
  },
  async (input) => {
    console.log("interpretProfileForMusicFlow input:", input);
    const {output} = await interpretProfileForMusicPrompt(input);
    
    if (!output) {
        console.warn("AI prompt 'interpretProfileForMusicPrompt' did not return a valid output structure for input:", input);
        let fallback = "popular music";
        if (input.songName) fallback = `music like ${input.songName}`;
        else if (input.instrumentTags) fallback = `${input.instrumentTags} music`;
        else if (input.analysis?.keywords && input.analysis.keywords.length > 0) fallback = `music related to ${input.analysis.keywords.join(' ')}`;
        else if (input.analysis?.location) fallback = `music from ${input.analysis.location}`;

        return {
            fallbackSearchQuery: fallback.trim()
        };
    }
    
    const { seed_tracks, seed_artists, seed_genres } = output;
    const totalSeeds = (seed_tracks?.length || 0) + (seed_artists?.length || 0) + (seed_genres?.length || 0);
    
    if (totalSeeds === 0 && !output.fallbackSearchQuery) {
        console.warn("AI (interpretProfileForMusicFlow) returned no seeds and no fallback query. Forcing a fallback.");
        let fallback = "popular music";
        if (input.songName) fallback = `music like ${input.songName}`;
        else if (input.instrumentTags) fallback = `${input.instrumentTags} music`;
        else if (input.analysis?.keywords && input.analysis.keywords.length > 0) fallback = `music related to ${input.analysis.keywords.join(' ')}`;
        else if (input.analysis?.location) fallback = `music from ${input.analysis.location}`;
        else if (input.analysis?.sourceUrl) fallback = `music related to content from ${input.analysis.sourceUrl}`;
        
        output.fallbackSearchQuery = fallback.trim();
    }
    console.log("interpretProfileForMusicFlow output:", output);
    return output;
  }
);

export async function interpretProfileAnalysisForMusic(input: InterpretProfileForMusicInput): Promise<InterpretMusicalIntentOutput> {
  // The actual return type of the flow matches InterpretMusicalIntentOutput
  return interpretProfileForMusicFlow(input) as Promise<InterpretMusicalIntentOutput>;
}
    

    