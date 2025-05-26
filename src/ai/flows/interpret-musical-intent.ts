
// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent.
 * It takes user's mood, optional song link metadata, and other preferences.
 * It translates these into structured parameters for Spotify's recommendations endpoint or a fallback search query.
 *
 * @exported
 * - `InterpretMusicalIntentInput`: The input type for the interpretMusicalIntent function.
 * - `InterpretMusicalIntentOutput`: The return type for the interpretMusicalIntent function.
 * - `interpretMusicalIntent`: The function that handles the musical intent interpretation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrackMetadataInputSchema = z.object({
  id: z.string().optional().describe("Spotify track ID if available."),
  title: z.string().optional(),
  artist: z.string().optional(),
  artistId: z.string().optional().describe("Spotify artist ID if available."),
  album: z.string().optional(),
  energy: z.number().optional(),
  danceability: z.number().optional(),
  tempo: z.number().optional(),
  valence: z.number().optional(),
}).optional();

const InterpretMusicalIntentInputSchema = z.object({
  moodDescription: z.string().describe('Description of the desired mood or vibe. This is a primary input.'),
  // User's direct inputs from the form
  songName: z.string().optional().describe('The name of a song the user likes (from form).'),
  artistName: z.string().optional().describe('The name of an artist the user likes (from form).'),
  instrumentTags: z.string().optional().describe('Comma-separated list of key instruments (from form).'),
  genre: z.string().optional().describe('The desired genre of the song (from form).'),
  // Derived from link, or the link itself
  derivedTrackMetadata: TrackMetadataInputSchema.describe('Metadata derived from a provided song link (e.g., Spotify track details).'),
  songLink: z.string().url().optional().describe('Original song link provided by user (Spotify, YouTube, Apple Music). Used for context if metadata fetch fails or for non-Spotify links.'),
  audioSnippet: z.string().optional().describe(
    "A short audio snippet of the song, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

const InterpretMusicalIntentOutputSchema = z.object({
  seed_tracks: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify track IDs to use as seeds for recommendations. Example: ["3n3Ppam7vgaVa1iaRUc9Lp"]'),
  seed_artists: z.array(z.string()).max(5).optional().describe('Up to 5 Spotify artist IDs to use as seeds. Example: ["3TVXtAsR1Inumwj472S9r4"]'),
  seed_genres: z.array(z.string()).max(5).optional().describe('Up to 5 genre strings to use as seeds. Example: ["pop", "nu-disco"]'),
  target_energy: z.number().min(0).max(1).optional().describe('Target energy level (0.0 to 1.0).'),
  target_danceability: z.number().min(0).max(1).optional().describe('Target danceability level (0.0 to 1.0).'),
  target_tempo: z.number().optional().describe('Target tempo in BPM (e.g., 120).'),
  target_valence: z.number().min(0).max(1).optional().describe('Target valence (musical positiveness, 0.0 to 1.0).'),
  // Fallback search query if recommendation parameters cannot be determined
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
  prompt: `You are a sophisticated music recommendation engine. Your goal is to translate user preferences and/or a provided seed track's metadata into a structured set of parameters for Spotify's recommendations endpoint.

User's Vibe Description: "{{{moodDescription}}}" (This is the primary driver for the recommendation)

{{#if derivedTrackMetadata}}
The user provided a link to a song, and we've extracted the following metadata from it:
Seed Track ID: {{derivedTrackMetadata.id}}
Seed Track Title: {{derivedTrackMetadata.title}}
Seed Track Artist: {{derivedTrackMetadata.artist}} (ID: {{derivedTrackMetadata.artistId}})
Seed Track Album: {{derivedTrackMetadata.album}}
Seed Track Features:
  {{#if derivedTrackMetadata.energy}}Energy: {{derivedTrackMetadata.energy}}{{/if}}
  {{#if derivedTrackMetadata.danceability}}Danceability: {{derivedTrackMetadata.danceability}}{{/if}}
  {{#if derivedTrackMetadata.tempo}}Tempo: {{derivedTrackMetadata.tempo}} BPM{{/if}}
  {{#if derivedTrackMetadata.valence}}Valence: {{derivedTrackMetadata.valence}}{{/if}}
If this derivedTrackMetadata is available and has an ID, prioritize using \\\`derivedTrackMetadata.id\\\` in \\\`seed_tracks\\\` and/or \\\`derivedTrackMetadata.artistId\\\` in \\\`seed_artists\\\`.
{{else if songLink}}
The user provided this link: {{{songLink}}}. If this is a recognizable song, try to infer its characteristics and use them to inform the seeds and targets. If it's a Spotify link but metadata couldn't be fetched, use the context of the link.
{{/if}}

User's other preferences from the form (use these to refine recommendations, find seeds if no link is provided, or as a fallback):
Preferred Song Name (from form): {{{songName}}}
Preferred Artist Name (from form): {{{artistName}}}
Preferred Instruments (from form): {{{instrumentTags}}}
Preferred Genre (from form): {{{genre}}}

{{#if audioSnippet}}
An audio snippet was also provided. Consider its implied characteristics.
Audio Snippet: {{media url=audioSnippet}}
{{/if}}

Based on ALL the information above (prioritizing the vibe description and any derivedTrackMetadata if available), please return a JSON object matching the InterpretMusicalIntentOutputSchema.
Your main goal is to provide parameters for Spotify's recommendations endpoint.
- Ensure you provide at least one seed (track, artist, or genre) if possible. You can use up to 5 seeds in total (e.g., 1 track, 2 artists, 2 genres).
- \\\`seed_tracks\\\`: (Optional) Array of Spotify track IDs. If \\\`derivedTrackMetadata.id\\\` is present, use it.
- \\\`seed_artists\\\`: (Optional) Array of Spotify artist IDs. If \\\`derivedTrackMetadata.artistId\\\` is present, use it.
- \\\`seed_genres\\\`: (Optional) Array of Spotify genre strings. Infer from mood, artist, or provided genre.
- \\\`target_energy\\\`, \\\`target_danceability\\\`, \\\`target_tempo\\\`, \\\`target_valence\\\`: (Optional) Floats between 0.0 and 1.0 (tempo is BPM). Derive these from the mood and/or seed track features.

IMPORTANT:
1. If you can confidently determine seeds (track, artist, or genre), prioritize populating \\\`seed_tracks\\\`, \\\`seed_artists\\\`, and \\\`seed_genres\\\` along with any relevant \\\`target_*\\\` values.
2. If you CANNOT confidently determine specific seeds (e.g., only a vague mood description is given without a usable link or specific song/artist names), then provide a \\\`fallbackSearchQuery\\\` string. This query should be a descriptive search term for Spotify (e.g., "upbeat electronic music", "chill acoustic vibes").
3. The \\\`fallbackSearchQuery\\\` should ONLY be used if no seeds can be generated. Do not provide both seeds and a fallbackSearchQuery.
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
    // Basic validation for total seeds - though AI should handle this from prompt.
    // This is more of a conceptual check for the prompt's effectiveness.
    // The Spotify API itself will reject >5 seeds.
    const {output} = await interpretMusicalIntentPrompt(input);

    if (output) {
        const { seed_tracks, seed_artists, seed_genres } = output;
        const totalSeeds = (seed_tracks?.length || 0) + (seed_artists?.length || 0) + (seed_genres?.length || 0);
        if (totalSeeds > 5) {
            console.warn("AI returned more than 5 seeds, this might be an issue for Spotify. Prompt may need refinement.", output);
            // Potentially truncate seeds here if necessary, or let Spotify handle it.
            // For now, we'll pass them as is.
        }
        if (totalSeeds === 0 && !output.fallbackSearchQuery) {
            console.warn("AI returned no seeds and no fallback query. This might lead to no results.", output);
            // Could force a fallback query here based on moodDescription if critical
            // output.fallbackSearchQuery = `music for ${input.moodDescription}`;
        }
    }
    return output!;
  }
);

