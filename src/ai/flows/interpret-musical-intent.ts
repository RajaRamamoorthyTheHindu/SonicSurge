// src/ai/flows/interpret-musical-intent.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to interpret user musical intent based on various inputs.
 *
 * The flow `interpretMusicalIntent` takes song details, mood descriptions, instrument tags, and genre preferences as input.
 * It then uses an AI prompt to translate these inputs into a structured query object.
 *
 * @exported
 * - `InterpretMusicalIntentInput`: The input type for the interpretMusicalIntent function.
 * - `InterpretMusicalIntentOutput`: The return type for the interpretMusicalIntent function.
 * - `interpretMusicalIntent`: The function that handles the musical intent interpretation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterpretMusicalIntentInputSchema = z.object({
  songName: z.string().describe('The name of the song (required if using this method)'),
  artistName: z.string().optional().describe('The name of the artist (optional)'),
  moodDescription: z.string().describe('Description of the desired mood or feeling of the song'),
  instrumentTags: z.string().describe('Comma-separated list of key instruments'),
  genre: z.string().describe('The desired genre of the song'),
  songLink: z.string().optional().describe('Song link from streaming platforms (Spotify, Apple Music, YouTube)'),
  audioSnippet: z.string().optional().describe(
    "A short audio snippet of the song, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type InterpretMusicalIntentInput = z.infer<typeof InterpretMusicalIntentInputSchema>;

const InterpretMusicalIntentOutputSchema = z.object({
  moodDescriptors: z.array(z.string()).describe('List of mood descriptors derived from the input'),
  instrumentTags: z.array(z.string()).describe('List of key instruments'),
  tempo: z.string().describe('The desired tempo of the song (e.g., fast, slow, moderate)'),
  genreAffinities: z.array(z.string()).describe('List of genre affinities'),
  artistSimilarity: z.array(z.string()).describe('List of artists with similar styles'),
  trackMetadata: z.object({
    trackId: z.string().optional().describe('The ID of the track, if available'),
    trackUrl: z.string().optional().describe('The URL of the track, if available'),
  }).optional().describe('Optional track ID or URL metadata'),
});
export type InterpretMusicalIntentOutput = z.infer<typeof InterpretMusicalIntentOutputSchema>;

export async function interpretMusicalIntent(input: InterpretMusicalIntentInput): Promise<InterpretMusicalIntentOutput> {
  return interpretMusicalIntentFlow(input);
}

const interpretMusicalIntentPrompt = ai.definePrompt({
  name: 'interpretMusicalIntentPrompt',
  input: {schema: InterpretMusicalIntentInputSchema},
  output: {schema: InterpretMusicalIntentOutputSchema},
  prompt: `You are an AI music expert. Your job is to take in user preferences for a song and convert it into a structured query.

  Here are the user's preferences:

  Song Name: {{{songName}}}
  Artist Name: {{{artistName}}}
  Mood Description: {{{moodDescription}}}
  Instrument Tags: {{{instrumentTags}}}
  Genre: {{{genre}}}
  Song Link: {{{songLink}}}
  {{#if audioSnippet}}
  Audio Snippet: {{media url=audioSnippet}}
  {{/if}}

  Based on the above information, please provide the following:

  - moodDescriptors: List of mood descriptors derived from the input.
  - instrumentTags: List of key instruments.
  - tempo: The desired tempo of the song (e.g., fast, slow, moderate).
  - genreAffinities: List of genre affinities.
  - artistSimilarity: List of artists with similar styles.
  - trackMetadata: The ID and URL of the track, if available.

  Make sure that your response is valid JSON and can be parsed by a computer.
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
    return output!;
  }
);

